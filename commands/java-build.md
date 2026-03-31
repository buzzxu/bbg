# /java-build

## Description
Fix Java build errors by running Maven or Gradle, categorizing errors, and fixing them systematically with re-verification after each fix.

## Usage
```
/java-build
/java-build src/main/java/com/example/
/java-build --gradle
```

## Process
1. **Run compile** — Execute `mvn compile` or `gradle compileJava` and capture all errors
2. **Run static analysis** — Execute `mvn verify -DskipTests` for plugin and resource checks
3. **Categorize errors** — Group by type:
   - Compilation errors (type mismatches, missing methods, generics violations)
   - Dependency errors (version conflicts, missing artifacts, BOM incompatibilities)
   - Plugin errors (misconfigured Maven plugins, Gradle task failures)
   - Resource errors (missing properties files, malformed XML, encoding issues)
4. **Prioritize** — Fix in order: dependencies → compilation → plugins → resources
5. **Fix one at a time** — Apply smallest change to resolve each error
6. **Re-verify** — Run `mvn compile` or `gradle compileJava` after each fix
7. **Final check** — Run `mvn verify` or `gradle build`

## Output
For each error fixed:
- Error message and file:line location
- Root cause analysis
- Fix applied
- Remaining error count

Final summary:
- Total errors found and fixed
- Compile status: pass/fail
- Plugin status: pass/fail
- Test status: pass/fail

## Rules
- Fix dependency versions first — many compilation errors resolve with correct versions
- Run `mvn dependency:tree` or `gradle dependencies` to diagnose version conflicts
- Never downgrade Spring Boot BOM version to fix individual dependency issues
- Use `mvn help:effective-pom` to debug inherited configuration
- Check parent POM version compatibility when dependency resolution fails
- Verify Java source/target version matches the runtime JDK
- Run `mvn clean` or `gradle clean` before rebuilding if incremental build shows stale errors

## Examples
```
/java-build                                # Build entire project with Maven
/java-build src/main/java/com/example/     # Focus on specific package
/java-build --gradle                       # Use Gradle instead of Maven
```
