from fabric.api import env, cd, prefix, sudo as _sudo, run as _run, hide, task
from fabric.contrib.files import exists, upload_template
from fabric.colors import yellow, green, blue, red
import sys, os
from functools import wraps

@task
def local():
    env.user = 'afaq'
    env.hosts = ['localhost']

def log_call(func):
    @wraps(func)
    def logged(*args, **kawrgs):
        header = "-" * len(func.__name__)
        _print(green("\n".join([header, func.__name__, header]), bold=True))
        return func(*args, **kawrgs)
    return logged

def _print(output):
    print
    print output
    print

def print_command(command):
    _print(blue("$ ", bold=True) +
           yellow(command, bold=True) +
           red(" ->", bold=True))


if sys.argv[0].split(os.sep)[-1] == "fab":
    try:
        print "imported settings"
        settings = __import__("settings", globals(), locals(), [], -1)
    except (ImportError, AttributeError):
        print "Aborting, cannot find settings."
        exit()

@task
def run(command, show=True):
    """
    Runs a shell comand on the remote server.
    """
    if show:
        print_command(command)
    with hide("running"):
        return _run(command)


@task
def sudo(command, show=True):
    """
    Runs a command as sudo.
    """
    if show:
        print_command(command)
    with hide("running"):
        return _sudo(command)


def postgres(command):
    """
    Runs the given command as the postgres user.
    """
    show = not command.startswith("psql")
    return run("sudo -u root sudo -u postgres %s" % command, show=show)


@task
def psql(sql, show=True):
    """
    Runs SQL against the project's database.
    """
    out = postgres('psql -c "%s"' % sql)
    if show:
        print_command(sql)
    return out

@task
@log_call
def createdb():
    username = settings.DATABASES['default'].get('USER', '')
    db_name = settings.DATABASES['default'].get('NAME', '')
    try:
        psql("DROP DATABASE %s;" % db_name)
    except BaseException:
        pass
    try:
        psql("DROP USER %s;" % username)
    except BaseException:
        pass

    # Create DB and DB user.
    pw = settings.DATABASES['default'].get('PASSWORD', '')

    user_sql_args = (username, pw.replace("'", "\'"))
    user_sql = "CREATE USER %s WITH ENCRYPTED PASSWORD '%s';" % user_sql_args
    psql(user_sql, show=False)
    shadowed = "*" * len(pw)
    print_command(user_sql.replace("'%s'" % pw, "'%s'" % shadowed))
    psql("CREATE DATABASE %s WITH OWNER %s ENCODING = 'UTF8' "
         "LC_CTYPE = '%s' LC_COLLATE = '%s' TEMPLATE template0;" %
         (db_name, username, 'en_GB.UTF-8', 'en_GB.UTF-8'))
