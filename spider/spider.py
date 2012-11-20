from urllib2 import urlopen, URLError
from jnius import autoclass
from bs4 import BeautifulSoup
from datetime import datetime
from dateutil import parser as date_parser
from tldextract.tldextract import extract

import gevent
from gevent import monkey
monkey.patch_all()
from gevent.queue import JoinableQueue
from gevent import Timeout

# web interface to data sets 

# currently hitting about 2 pages per second indexed => approx 175000 pages per day
# not sure how much of the bounding is really network bounding


#import gevent_profiler
#gevent_profiler.set_stats_output('my-stats.txt')
#gevent_profiler.set_summary_output('my-summary.txt')
#gevent_profiler.set_trace_output('my-trace.txt')
#gevent_profiler.print_percentages(True)

#default_extractor = autoclass("de.l3s.boilerpipe.extractors.DefaultExtractor")
article_extractor = autoclass("de.l3s.boilerpipe.extractors.ArticleExtractor")


max_depth = 4
num_workers = 500

crawled = []

q = JoinableQueue()
articles = JoinableQueue()


def worker():
    while True:
        url, depth = q.get()
        try:
            gevent_crawl_from(url, depth)
        finally:
            q.task_done()

def start_workers():
    for i in range(num_workers):
        gevent.spawn(worker)

def gevent_crawl(start_url):
    start_workers()
    gevent_crawl_from(start_url)
    q.join()


def gevent_crawl_from(start_url, depth=0):
    if depth == max_depth:
        return
    url = start_url.split('://')[1]
    if url not in crawled:
        crawled.append(url)
    article = Article(start_url)

    try:
        article.html
    except AttributeError:
        print "try again"
        gevent_crawl_from(start_url, depth)
        return 
    
    print `article.article`
    within_dir = article.sub_directory_links + article.same_directory_links 
    
    # remove_duplicates
    for link in within_dir:
        if link['href'] not in crawled:
            #print `link`
            #print `depth`
            q.put(['http://' + link['href'],  depth+1])


class TimeoutError(Exception):
    pass

class Article(object):
    """XXX use riak for distributed storage or dynamodb?
    XXX use doctests?
    XXX consider redirects from urlopen url
    """
    def __init__(self, url):
        self.url = url
        self.protocol, self.domain = self.url.split("://")  #e.g. news.bbc.co.uk
        self.domain = self.domain.split('/')[0]
        self.site_data = sites[self.domain]

        self.total_words = {}

        timeout = Timeout(30, TimeoutError)
        timeout.start()
        try:
            self.html = self.read_url()
        except TimeoutError:
            print url + " timed out"
            return 
        finally:
            timeout.cancel()

        self.text = self.boiler_extract()
        self.soup = BeautifulSoup(self.html, 'lxml')
        self.article = self.is_article()

        if self.article:
            self.calc_total_words()
            articles.put(self)

        self.find_links()

    def is_article(self):
        """some heuristics to see if we think this is an article or just some navigation page
        e.g.:
        - length of article extracted
        - does get_title succeed
        - number of words in links to it OR the title
        """
        try:
            self.title = self.get_title()
            self.date = self.get_date()
        except IndexError:
            return False
        if len(self.text.split(' ')) < 75:
            return False
        return True

    def calc_total_words(self):
        self.total_words['title'] = len(self.title.split(" "))
        self.total_words['text'] = len(self.text.split(" "))

    def normalise_links(self):
        for a in self.soup.findAll('a'):
            try:
                href = a.attrs['href'].encode('utf-8')
            except KeyError:
                continue
                
            # ignore in-page references
            if href.startswith('#'):
                continue
            elif '#' in href:
                href = href.split('#')[0]
            # add absolute links without the protocol
            if "://" in href:
                a.attrs['href'] = href.split('://')[1]
            # its a root relative link prefix the domain
            elif href.startswith("/"):
                a.attrs['href'] = self.domain + a.attrs['href']
            #its a page relative link
            else:
                segments = href.split('/')
                url = self.url.split('/')[:-1]
                for seg in segments:
                    if seg == '..':
                        segments.remove('..')
                        url = url[:-1]
                    else:
                        break
                        
                a.attrs['href'] = '/'.join(url + segments)
                
            self.all_links.append(a.attrs)
        

    def classify_links(self):
        self.same_domain_links = []
        self.sub_directory_links = []
        self.same_directory_links = []
        self.super_directory_links = []
        self.sub_domain_links = []
        self.super_domain_links = []
        self.sister_domain_links = []
        self.external_links = []

        dir_url = '/'.join(self.url.split('://')[1].split('/')[:-1])
        url_tld = extract(self.url)
        for link in self.all_links:
            link_tld = extract(link['href'])
            if link_tld.tld == url_tld.tld and link_tld.domain == url_tld.domain:
                # internal link within the domain name e.g. bbc.co.uk
                if link_tld.subdomain == url_tld.subdomain:
                    # we are at the same subdomain
                    self.same_domain_links.append(link)
                    if link['href'].startswith(dir_url):
                        remainder = link['href'].replace(dir_url, '')
                        r_segs = remainder.split('/')
                        if len(r_segs) == 2:
                            self.same_directory_links.append(link)
                        elif len(r_segs) > 2:
                            self.sub_directory_links.append(link)
                    else:
                        self.super_directory_links.append(link)

                elif link_tld.subdomain.endswith(url_tld.subdomain):
                    # this is a subdomain of the current_domain
                    self.sub_domain_links.append(link)
                elif url_tld.subdomain.endswith(link_tld.subdomain):
                    # this is a superdomain of the current domain
                    self.super_domain_links.append(link)
                else:
                    # this must be a sister domain of some kind
                    self.sister_domain_links.append(link)
            else:
                # external link
                self.external_links.append(link)
                

    def find_links(self):
        self.all_links = []
        self.normalise_links()
        self.classify_links()


    def boiler_extract(self):
        # check if this need patching to do asynchrous IO, or monkey patching does the job
        return article_extractor.INSTANCE.getText(self.html)

    def get_title(self):
        print self.soup.select(self.site_data["title_selector"])[0].text.encode("utf-8")
        return self.soup.select(self.site_data["title_selector"])[0].text.encode("utf-8")

    def get_date(self):
        #print `datetime.strptime(self.soup.select(self.site_data["date_selector"])[0].text, self.site_data['date_fmt'])`
        
        date_string = self.soup.select(self.site_data["date_selector"])[0].text
        print `date_string`
        return datetime.strptime(date_string, self.site_data['date_fmt'])
        #return date_parser.parse(date_string, fuzzy=True, dayfirst=True)

    def read_url(self):
        # check robots.txt
        try:
            handle = urlopen(self.url)
        except URLError:
            return ""
        return handle.read()

    


class Sites(dict):
    # add synopsis
    def __missing__(self, domain):
        domain_levels = domain.split('.')
        # look for entries at the next domain level i.e. news.bbc.co.uk -> bbc.co.uk

        if len(domain_levels) >= 2:
            return self['.'.join(domain_levels[1:])]
        

        # if we still can't find anything - now try and make a guess
        return {'title_selector':guess_title_selector(),
                'date_selector':guess_date_selector(),
                'date_fmt':guess_date_fmt()
                }

def guess_title_selector():
    return ''

def guess_date_selector():
    return ''

def guess_date_fmt():
    return ''


sites = Sites()
sites['bbc.co.uk'] = {'title_selector':"h1.story-header",
                      'date_selector':"span.date",
                      'date_fmt':"%d %B %Y"}
sites['guardian.co.uk']= {'title_selector':'#main-article-info h1',
                          'date_selector':'.publication time',
                          'date_fmt':"%A %d %B %Y %H.%M %Z"}

def test_Article(url):
    article = Article(url)
     # assert statements
    return article

