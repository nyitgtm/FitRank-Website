# Item Shop Firebase Integration Guide for iOS

## Firestore Collection Structure

Collection: `shopItems`

### Document Fields:
```swift
struct ShopItem: Codable {
    let id: String
    let name: String
    let description: String
    let category: String // "theme", "avatar", "frame", "badge", "powerup"
    let rarity: String // "common", "rare", "epic", "legendary"
    let price: Int // tokens
    let imageUrl: String
    let isActive: Bool
    let isFeatured: Bool
    let availableUntil: Date? // optional expiry
    let createdAt: Date
    let purchaseCount: Int
}
```

## Swift Code Example

```swift
import FirebaseFirestore

class ItemShopManager {
    private let db = Firestore.firestore()
    
    // Fetch all active items
    func fetchActiveItems(completion: @escaping ([ShopItem]) -> Void) {
        db.collection("shopItems")
            .whereField("isActive", isEqualTo: true)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    print("Error fetching items: \(error?.localizedDescription ?? "Unknown")")
                    completion([])
                    return
                }
                
                let items = documents.compactMap { doc -> ShopItem? in
                    let data = doc.data()
                    
                    // Check if item is expired
                    if let availableUntil = data["availableUntil"] as? Timestamp {
                        if availableUntil.dateValue() < Date() {
                            return nil // expired
                        }
                    }
                    
                    return try? doc.data(as: ShopItem.self)
                }
                
                completion(items)
            }
    }
    
    // Fetch featured items
    func fetchFeaturedItems(completion: @escaping ([ShopItem]) -> Void) {
        db.collection("shopItems")
            .whereField("isActive", isEqualTo: true)
            .whereField("isFeatured", isEqualTo: true)
            .addSnapshotListener { snapshot, error in
                // ... same as above
            }
    }
    
    // Purchase item
    func purchaseItem(itemId: String, userId: String, completion: @escaping (Bool) -> Void) {
        let batch = db.batch()
        
        // 1. Add purchase record
        let purchaseRef = db.collection("userPurchases").document()
        let purchase: [String: Any] = [
            "userId": userId,
            "itemId": itemId,
            "purchasedAt": Timestamp(date: Date()),
            "tokensSpent": 0 // get from item
        ]
        batch.setData(purchase, forDocument: purchaseRef)
        
        // 2. Increment purchase count
        let itemRef = db.collection("shopItems").document(itemId)
        batch.updateData(["purchaseCount": FieldValue.increment(Int64(1))], forDocument: itemRef)
        
        // 3. Commit batch
        batch.commit { error in
            completion(error == nil)
        }
    }
}
```

## User Purchases Collection

Collection: `userPurchases`

### Document Fields:
```swift
struct UserPurchase: Codable {
    let id: String
    let userId: String
    let itemId: String
    let purchasedAt: Date
    let tokensSpent: Int
}
```

## Real-time Updates

The iOS app should use `addSnapshotListener` instead of one-time fetches to get real-time updates when coaches add/remove/modify items.

## Filtering by Category

```swift
func fetchItemsByCategory(_ category: String, completion: @escaping ([ShopItem]) -> Void) {
    db.collection("shopItems")
        .whereField("isActive", isEqualTo: true)
        .whereField("category", isEqualTo: category)
        .addSnapshotListener { snapshot, error in
            // ... parse items
        }
}
```

## Notes

- All items are managed through the web dashboard
- No hardcoding needed - everything comes from Firebase
- Items automatically disappear when `isActive` is false or `availableUntil` has passed
- Purchase analytics are tracked automatically via `purchaseCount`
