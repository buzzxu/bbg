---
name: android-patterns
category: kotlin
description: Android patterns including Jetpack Compose, ViewModel, Room, Navigation, WorkManager, and Hilt dependency injection
---

# Android Patterns

## Overview

Use this skill when building or reviewing Android applications with modern Jetpack libraries. These patterns cover Compose UI, MVVM architecture, local data persistence, navigation, and dependency injection with Hilt.

## Key Patterns

### Jetpack Compose UI

```kotlin
@Composable
fun UserList(
    users: List<User>,
    onUserClick: (UserId) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(modifier = modifier) {
        items(users, key = { it.id.value }) { user ->
            UserRow(
                user = user,
                onClick = { onUserClick(user.id) },
            )
        }
    }
}

@Composable
fun UserRow(user: User, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(model = user.avatarUrl, contentDescription = null, modifier = Modifier.size(48.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(user.name, style = MaterialTheme.typography.bodyLarge)
            Text(user.email, style = MaterialTheme.typography.bodySmall)
        }
    }
}
```

### ViewModel with UiState

```kotlin
data class UserListState(
    val users: List<User> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class UserListViewModel @Inject constructor(
    private val userRepo: UserRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(UserListState())
    val state: StateFlow<UserListState> = _state.asStateFlow()

    init { loadUsers() }

    fun loadUsers() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            userRepo.getUsers()
                .onSuccess { users -> _state.update { it.copy(users = users, isLoading = false) } }
                .onFailure { e -> _state.update { it.copy(error = e.message, isLoading = false) } }
        }
    }
}

// In Composable
@Composable
fun UserListScreen(viewModel: UserListViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    when {
        state.isLoading -> CircularProgressIndicator()
        state.error != null -> ErrorMessage(state.error!!, onRetry = viewModel::loadUsers)
        else -> UserList(users = state.users, onUserClick = { /* navigate */ })
    }
}
```

### Room Database

```kotlin
@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val name: String,
    val email: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
)

@Dao
interface UserDao {
    @Query("SELECT * FROM users ORDER BY name ASC")
    fun observeAll(): Flow<List<UserEntity>>

    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun getById(id: String): UserEntity?

    @Upsert
    suspend fun upsert(user: UserEntity)

    @Query("DELETE FROM users WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Database(entities = [UserEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
}
```

### Hilt Dependency Injection

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideUserDao(db: AppDatabase): UserDao = db.userDao()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindUserRepository(impl: UserRepositoryImpl): UserRepository
}
```

### Navigation with Type-Safe Arguments

```kotlin
@Serializable
data class UserDetail(val userId: String)

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    NavHost(navController, startDestination = "users") {
        composable("users") {
            UserListScreen(onUserClick = { id ->
                navController.navigate(UserDetail(userId = id.value))
            })
        }
        composable<UserDetail> { backStackEntry ->
            val route = backStackEntry.toRoute<UserDetail>()
            UserDetailScreen(userId = route.userId)
        }
    }
}
```

### WorkManager for Background Tasks

```kotlin
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            syncRepository.syncAll()
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}

// Schedule periodic sync
val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(1, TimeUnit.HOURS)
    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .build()
WorkManager.getInstance(context).enqueueUniquePeriodicWork("sync", KEEP, syncRequest)
```

## Best Practices

- Use `StateFlow` + `collectAsStateWithLifecycle()` for lifecycle-aware UI state
- Keep Composables stateless — hoist state to ViewModel
- Use `LazyColumn` with stable `key` for efficient list rendering
- Use Hilt `@HiltViewModel` for ViewModel injection
- Use Room `Flow` returns for reactive database observation
- Use `Modifier` as the first optional parameter in every Composable

## Anti-patterns

- Performing I/O on the main thread — use `Dispatchers.IO` or `withContext`
- Observing flows without lifecycle awareness — use `collectAsStateWithLifecycle`
- God Activities/Fragments — use single-activity architecture with Compose navigation
- Hardcoding strings in Composables — use `stringResource()` for i18n
- Direct database access from Composables — go through ViewModel + Repository

## Testing Strategy

- Use `composeTestRule` for Compose UI testing with semantic matchers
- Test ViewModels with `kotlinx-coroutines-test` and `Turbine` for StateFlow
- Test Room DAOs with in-memory database (`Room.inMemoryDatabaseBuilder`)
- Use Hilt testing (`@HiltAndroidTest`) for integration tests with DI
- Use Robolectric for unit tests that need Android framework classes
