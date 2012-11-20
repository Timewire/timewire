#!/usr/bin/env python

import os

boilerpipe_classpath = ":../boiler_pipe/boilerpipe-1.2.0/boilerpipe-1.2.0.jar:../boiler_pipe/boilerpipe-1.2.0/lib/xerces-2.9.1.jar:../boiler_pipe/boilerpipe-1.2.0/lib/nekohtml-1.9.13.jar"

def set_java_classpath():
    if not os.environ.has_key('CLASSPATH'):
        os.environ['CLASSPATH'] = ''
    if boilerpipe_classpath  not in os.environ['CLASSPATH']:
        os.environ['CLASSPATH'] += boilerpipe_classpath

set_java_classpath()

from spider import gevent_crawl, articles
from process_articles import start_article_workers, title_has_word, text_has_word, text_word_frequency, title_word_frequency

def main():
    try:
        start_article_workers()
        gevent_crawl('http://www.bbc.co.uk/news/')
        articles.join()
    finally:
        import ipdb
        ipdb.set_trace()


if __name__ == "__main__":
    main()
