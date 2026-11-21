import os

# Test environment isolation sentinels
os.environ.setdefault('ENVIRONMENT', 'test')
os.environ['TRUSTED_HOSTS'] = 'testserver,localhost,127.0.0.1,logixa-flow-api.onrender.com'
