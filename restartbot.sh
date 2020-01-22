ps aux | grep 'grabtoken.py' | grep -v 'grep' | cut -c10-14 | xargs kill -9

