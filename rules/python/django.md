# Django: Python

Best practices for Django applications.

## Mandatory

- Use fat models, thin views — business logic lives in model methods and managers
- Use custom managers for reusable query logic: `User.objects.active()` not filtered inline
- Always use `select_related()` for ForeignKey and `prefetch_related()` for M2M to avoid N+1
- Define `__str__` on all models — it appears in admin and debugging output
- Use Django ORM exclusively — never write raw SQL unless performance requires it with a comment
- Run `python manage.py check --deploy` before deployment — fix all warnings
- Use database migrations for all schema changes — never modify the database manually

## Recommended

- Use `get_object_or_404()` in views — never catch `DoesNotExist` and return 404 manually
- Use class-based views for CRUD; function-based views for custom/simple endpoints
- Use signals sparingly — prefer explicit method calls for clarity and debuggability
- Use `django-filter` for query parameter filtering instead of manual parsing
- Use `F()` and `Q()` expressions for complex queries — avoid Python-side filtering
- Prefer `bulk_create()` and `bulk_update()` for batch operations
- Use `transaction.atomic()` for operations that must succeed or fail together
- Store configuration in environment variables with `django-environ` or `pydantic-settings`
- Use `GenericForeignKey` only as a last resort — prefer explicit ForeignKey relationships

## Forbidden

- Business logic in views or serializers — extract to model methods or service functions
- Signals for core business workflows — they obscure control flow and break debugging
- `objects.all()` in templates or views without pagination — always paginate querysets
- Hardcoding URLs — use `reverse()` or `{% url %}` template tag
- `DEBUG = True` in production settings — enforce via environment variable checks
- Mutable default arguments in model field definitions
- Circular imports between models — use string references: `ForeignKey("app.Model")`

## Examples

```python
# Good: Fat model with custom manager
class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)

class Product(models.Model):
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    objects = models.Manager()
    active = ActiveManager()

    def apply_discount(self, percent: Decimal) -> Decimal:
        return self.price * (1 - percent / 100)

# Bad: Logic in view
def product_view(request, pk):
    product = Product.objects.get(pk=pk)
    discounted = product.price * (1 - Decimal("0.10"))  # Logic in view

# Good: Avoiding N+1
orders = Order.objects.select_related("customer").prefetch_related("items")

# Bad: N+1 query
orders = Order.objects.all()
for order in orders:
    print(order.customer.name)  # Hits DB each iteration
```
