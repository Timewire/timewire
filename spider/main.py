#!/usr/bin/env python

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
