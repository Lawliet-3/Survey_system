# check_env_file.py
with open('.env', 'r') as f:
    content = f.read()
    print("Raw .env file content:")
    print(content)