def encrypt(token, password):
    # This mixes your token with your password
    encrypted = []
    for i in range(len(token)):
        key_char = password[i % len(password)]
        # XOR encryption
        encrypted.append(chr(ord(token[i]) ^ ord(key_char)))
    return "".join(encrypted).encode("utf-8").hex()

print("--- 🔐 SECURE TOKEN LOCKER ---")
token = input("1. Paste your GitHub Token (ghp_...): ").strip()
pwd   = input("2. Enter the Password you want to use: ").strip()

secret = encrypt(token, pwd)

print("\n✅ COPY THIS EXACT LINE into the top of script.js:")
print(f'const ENCRYPTED_TOKEN = "{secret}";')
