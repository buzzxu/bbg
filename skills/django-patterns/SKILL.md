---
name: django-patterns
category: python
description: Django patterns including models, views, serializers, middleware, signals, custom managers, and query optimization
---

# Django Patterns

## Overview

Use this skill when building or reviewing Django applications. These patterns cover model design, view architecture, query optimization, and the Django REST Framework (DRF) layer.

## Key Patterns

### Model Design with Custom Managers

```python
from django.db import models
from django.utils import timezone

class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)

class Article(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    author = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="articles")
    content = models.TextField()
    published_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()    # default
    active = ActiveManager()      # Article.active.all()

    class Meta:
        ordering = ["-published_at"]
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["-published_at"])]

    def publish(self) -> None:
        self.published_at = timezone.now()
        self.save(update_fields=["published_at"])
```

### Query Optimization — Preventing N+1

```python
# BAD: N+1 queries
articles = Article.objects.all()
for a in articles:
    print(a.author.username)  # each iteration hits the DB

# GOOD: select_related for ForeignKey/OneToOne
articles = Article.objects.select_related("author").all()

# GOOD: prefetch_related for ManyToMany/reverse FK
authors = User.objects.prefetch_related(
    Prefetch("articles", queryset=Article.active.only("title", "slug"))
).all()

# Use .only() / .defer() to limit fetched columns
Article.objects.only("title", "slug", "published_at").filter(is_active=True)
```

### DRF Serializers

```python
from rest_framework import serializers

class ArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = Article
        fields = ["id", "title", "slug", "author_name", "published_at"]
        read_only_fields = ["id", "slug"]

    def validate_title(self, value: str) -> str:
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters.")
        return value
```

### Class-Based Views with Permissions

```python
from rest_framework import generics, permissions

class IsAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user

class ArticleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Article.objects.select_related("author")
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]
```

### Middleware

```python
import time, logging

logger = logging.getLogger(__name__)

class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration = time.monotonic() - start
        logger.info(f"{request.method} {request.path} — {duration:.3f}s")
        return response
```

### Signals — Decoupled Side Effects

```python
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Article)
def notify_subscribers(sender, instance, created, **kwargs):
    if created:
        send_notification.delay(article_id=instance.pk)  # async via Celery
```

## Best Practices

- Use `select_related` / `prefetch_related` on every queryset that traverses relations
- Add database indexes for fields used in `filter()`, `order_by()`, and `distinct()`
- Keep model methods for domain logic; keep views thin
- Use `update_fields` in `.save()` to avoid overwriting concurrent changes
- Use Django's `F()` and `Q()` expressions for atomic updates and complex filters
- Paginate all list endpoints — never return unbounded querysets

## Anti-patterns

- Fat views — put business logic in models or service layers, not views
- Using signals for core business logic — makes flow hard to trace
- Calling `.all()` without filtering in production code — unbounded queries
- N+1 queries — always profile with `django-debug-toolbar` or `nplusone`
- Raw SQL when the ORM can express the query — loses portability and safety

## Testing Strategy

- Use `pytest-django` with `@pytest.mark.django_db` for database tests
- Use `APIClient` from DRF for endpoint tests with authentication
- Use `factory_boy` for test data instead of fixtures or manual creation
- Test querysets separately from views to isolate data logic
- Use `assertNumQueries` to catch N+1 regressions in tests
