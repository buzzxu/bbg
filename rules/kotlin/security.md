# Security: Kotlin

Kotlin and Android-specific security rules.

## Mandatory

- Enable ProGuard/R8 code shrinking and obfuscation for all release builds
- Implement certificate pinning for API communication — use OkHttp `CertificatePinner`
- Use `EncryptedSharedPreferences` (Jetpack Security) for storing sensitive data locally
- Never store secrets (API keys, tokens) in the APK — use BuildConfig with CI injection
- Validate all server responses before processing — never trust data from the network
- Use `BiometricPrompt` for biometric authentication — follow the AndroidX Biometric API
- Use `https://` exclusively for all network communication — block cleartext traffic in `network_security_config.xml`

## Recommended

- Use Android Keystore for cryptographic key storage — keys never leave the secure hardware
- Implement secure IPC: use explicit intents, validate `Intent` extras, restrict exported components
- Use `SafetyNet` / `Play Integrity API` for device attestation in sensitive operations
- Encrypt database files with SQLCipher for Room databases containing sensitive data
- Use `WebView` with JavaScript disabled by default — enable only when explicitly required
- Implement session timeout — clear credentials and navigate to login after inactivity
- Use `StrictMode` in debug builds to detect insecure filesystem and network operations
- Pin OkHttp/Retrofit dependencies and audit transitive dependencies regularly
- Use `content://` URIs with `FileProvider` instead of `file://` URIs for sharing files

## Forbidden

- Storing tokens, passwords, or API keys in plain `SharedPreferences` or SQLite
- Logging sensitive data (tokens, passwords, PII) — even at `DEBUG` level
- Exported activities, services, or receivers without `permission` protection
- `android:allowBackup="true"` without encrypting backup data
- `WebView.setJavaScriptEnabled(true)` without URL allowlisting and input sanitization
- Using `MODE_WORLD_READABLE` or `MODE_WORLD_WRITABLE` for file creation
- Hardcoded encryption keys or initialization vectors in source code

## Examples

```kotlin
// Good: Encrypted SharedPreferences
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val prefs = EncryptedSharedPreferences.create(
    context, "secure_prefs", masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
prefs.edit().putString("auth_token", token).apply()

// Bad: Plain SharedPreferences for tokens
val prefs = context.getSharedPreferences("prefs", MODE_PRIVATE)
prefs.edit().putString("auth_token", token).apply()

// Good: Certificate pinning
val client = OkHttpClient.Builder()
    .certificatePinner(CertificatePinner.Builder()
        .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
        .build())
    .build()

// Good: Biometric authentication
val promptInfo = BiometricPrompt.PromptInfo.Builder()
    .setTitle("Authenticate")
    .setNegativeButtonText("Cancel")
    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
    .build()
```
