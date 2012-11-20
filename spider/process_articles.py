from spider import articles
import gevent

num_workers = 30

title_has_word = {}
title_word_frequency = {'__all__':0}

text_has_word = {}
text_word_frequency = {'__all__':0}

def relative_frequency (word):
     title
     title_word_frequency


def process_article(article):
    """[(freq, word)].orderBy(freq)
    {word:set(articles)}
    
    """
    """calculate sd...and some 3*sd limits
     look at Levestein word distance
     remove punctionaction
     deal with word endings

     look at co-variance of word probabilities - correlation
     look at poisson distribution
     look at log-normal law
     generalise inverse guass poisson law
     extended generalised Zipf law
     """
    
    article.word_count = {'title':{},
                          'text':{}}

    for word in article.title.split():
        count = article.word_count['title'].get(word, 0)
        article.word_count['title'][word] = count + 1

    
    for word, count in article.word_count['title'].iteritems():
        title_word_frequency.setdefault(word, 0)
        title_word_frequency[word] += count
        title_word_frequency['__all__'] += count
        
        title_has_word.setdefault(word, [])
        title_has_word[word].append(str(float(count)/float(article.total_words['title'])) + '-' + article.url) 

    for word in article.text.split():
        count = article.word_count['text'].get(word, 0)
        article.word_count['text'][word] = count + 1

    for word, count in article.word_count['text'].iteritems():
        text_word_frequency.setdefault(word, 0)
        text_word_frequency[word] += count
        text_word_frequency['__all__'] += count

        text_has_word.setdefault(word, [])
        text_has_word[word].append(str(float(count)/float(article.total_words['text'])) + '-' + article.url) 



def article_worker():
    while True:
        article = articles.get()
        try:
            process_article(article)
        finally:
            articles.task_done()

def start_article_workers():
    for i in range(num_workers):
        gevent.spawn(article_worker)
