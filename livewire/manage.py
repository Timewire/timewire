#!/usr/bin/env python
import os
import sys
from gevent import monkey
monkey.patch_all()
from gevent_psycopg2 import monkey_patch
monkey_patch()

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "livewire.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
