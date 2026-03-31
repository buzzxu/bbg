---
name: jpa-patterns
category: java
description: JPA/Hibernate patterns for entity mapping, lazy loading, N+1 prevention, criteria queries, and projections
---

# JPA/Hibernate Patterns

## Overview

Use this skill when designing or reviewing JPA entity mappings and queries. These patterns address the most common performance pitfalls (N+1 queries, lazy loading exceptions) and show how to write efficient, maintainable data access code.

## Key Patterns

### Entity Mapping with Proper Defaults

```java
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_customer", columnList = "customer_id"),
    @Index(name = "idx_order_status", columnList = "status")
})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)  // ALWAYS lazy for @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    // Helper methods to maintain bidirectional consistency
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }
}
```

### N+1 Prevention with Fetch Strategies

```java
// PROBLEM: N+1 — loads each customer individually
List<Order> orders = orderRepository.findAll();
orders.forEach(o -> System.out.println(o.getCustomer().getName())); // N extra queries

// SOLUTION 1: JOIN FETCH in JPQL
@Query("SELECT o FROM Order o JOIN FETCH o.customer WHERE o.status = :status")
List<Order> findByStatusWithCustomer(@Param("status") OrderStatus status);

// SOLUTION 2: EntityGraph
@EntityGraph(attributePaths = {"customer", "items"})
List<Order> findByStatus(OrderStatus status);

// SOLUTION 3: Batch fetching in persistence config
// spring.jpa.properties.hibernate.default_batch_fetch_size=25
```

### Projections — Fetch Only What You Need

```java
// Interface-based projection
public interface OrderSummary {
    Long getId();
    String getStatus();
    @Value("#{target.customer.name}")
    String getCustomerName();
}

List<OrderSummary> findByCreatedAtAfter(Instant after);

// DTO projection with constructor expression
@Query("""
    SELECT new com.example.dto.OrderStats(o.status, COUNT(o), SUM(o.total))
    FROM Order o
    GROUP BY o.status
    """)
List<OrderStats> getOrderStatistics();

// Record projection (Spring Data 3+)
public record OrderBrief(Long id, OrderStatus status, Instant createdAt) {}
List<OrderBrief> findAllProjectedBy();
```

### Criteria API for Dynamic Queries

```java
@Repository
public class OrderSearchRepository {
    @PersistenceContext
    private EntityManager em;

    public List<Order> search(OrderSearchCriteria criteria) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Order> query = cb.createQuery(Order.class);
        Root<Order> order = query.from(Order.class);

        List<Predicate> predicates = new ArrayList<>();

        if (criteria.status() != null) {
            predicates.add(cb.equal(order.get("status"), criteria.status()));
        }
        if (criteria.minTotal() != null) {
            predicates.add(cb.greaterThanOrEqualTo(order.get("total"), criteria.minTotal()));
        }
        if (criteria.fromDate() != null) {
            predicates.add(cb.greaterThanOrEqualTo(order.get("createdAt"), criteria.fromDate()));
        }

        query.where(predicates.toArray(new Predicate[0]));
        query.orderBy(cb.desc(order.get("createdAt")));

        return em.createQuery(query)
            .setMaxResults(criteria.limit())
            .getResultList();
    }
}
```

### Optimistic Locking

```java
@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version; // Hibernate auto-increments on update

    private String name;
    private int stock;

    public void decrementStock(int quantity) {
        if (this.stock < quantity) throw new InsufficientStockException();
        this.stock -= quantity;
        // If another transaction modified this row, @Version causes OptimisticLockException
    }
}
```

### Auditing with @CreatedDate / @LastModifiedDate

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class Auditable {
    @CreatedDate
    @Column(updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;
}

// Enable: @EnableJpaAuditing on a @Configuration class
```

## Best Practices

- Set `FetchType.LAZY` on all `@ManyToOne` and `@OneToMany` — eager is almost never correct
- Use `JOIN FETCH` or `@EntityGraph` when you know you need related entities
- Use projections (interfaces, DTOs, records) for read-only queries — avoids loading full entities
- Always use `@Version` for entities updated by concurrent users
- Use `orphanRemoval = true` on `@OneToMany` when children don't exist without parents
- Index foreign key columns and columns used in WHERE clauses

## Anti-patterns

- `FetchType.EAGER` on collections — loads the entire graph on every query
- Open Session in View (`spring.jpa.open-in-view=true`) — hides lazy loading issues
- Using entities as API response DTOs — leaks internal structure and triggers lazy loads
- `CascadeType.ALL` on `@ManyToOne` — child should not cascade operations to parent
- N+1 queries in loops — always verify query count with logging or tests

## Testing Strategy

- Use `@DataJpaTest` for repository tests against a real database (Testcontainers)
- Assert query count with Hibernate statistics or `datasource-proxy`
- Test optimistic locking by simulating concurrent updates in separate transactions
- Test projections to verify only needed columns are selected
- Use Flyway or Liquibase test migrations to validate schema changes


## Related

- **Agents**: [java-reviewer](../../agents/java-reviewer.md)
- **Rules**: [java/spring](../../rules/java/spring.md)
- **Commands**: [/java-review](../../commands/java-review.md)
