# lock_key.py
def lock_token(token, password):
    # This mixes your token with your password so it can't be read plainly
    encrypted = []
    for i in range(len(token)):
        key_char = password[i % len(password)]
        # XOR operation to hide the token
        hidden_char = chr(ord(token[i]) ^ ord(key_char))
        encrypted.append(hidden_char)
    
    # Convert to hex string for easy copying
    return "".join(encrypted).encode("utf-8").hex()

print("--- 🔐 Token Locker ---")
token = input("Paste your GitHub Token (ghp_...): ").strip()
password = input("Enter the password you want to use (e.g. 556655): ").strip()

secret_code = lock_token(token, password)

print("\n✅ DONE! Copy the line below and paste it into the TOP of script.js:")
print(f'const SECRET_KEY = "{secret_code}";')
