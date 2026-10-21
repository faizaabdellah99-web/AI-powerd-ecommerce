/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  LOCAL AI — Smart Rule-Based Response Engine
 *  Gives appropriate, context-aware answers for ANY question without needing
 *  the Gemini API. Uses keyword scoring, entity extraction, and topic matching
 *  to generate meaningful responses.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Topic definitions with weighted keywords ─────────────────────────────────
// Each topic has:
//   id        — stable identifier
//   label     — display label
//   keywords  — [keyword, weight] pairs (weight = importance)
//   respond   — function(message, entities) → response text
//   aliases   — common alternative phrasings

const TOPICS = [
  // ═════════════ SALES & REVENUE ═════════════
  {
    id: 'revenue',
    label: 'Sales & Revenue',
    keywords: [
      ['revenue', 5], ['sale', 4], ['income', 4], ['income', 4], ['earn', 3],
      ['money', 3], ['profit', 4], ['growth', 3], ['performance', 3],
      ['sell', 3], ['selling', 3], ['sales', 5], ['sales growth', 6],
      ['revenue growth', 6], ['monthly revenue', 6], ['weekly sales', 5],
      ['daily sales', 5], ['total sales', 5], ['sold', 3], ['sales report', 5],
      ['sales analysis', 5], ['sales trend', 5], ['sales data', 4], ['sales figure', 4],
      ['ETB', 2], ['birr', 2], ['$', 1],
    ],
    respond: (msg, ent) => `📊 **Sales & Revenue Analysis:**

• **Today's performance** is visible on your Dashboard — revenue, orders, and top products all in one place
• **Weekly/Monthly trends** show which direction your business is moving
• **Top 20% of products** typically drive 80% of revenue — focus your marketing there

**Quick strategies to boost revenue:**
• Bundle slow-moving items with popular products to increase order value
• Offer free shipping above a threshold (e.g., $50) to increase average order size
• Re-engage customers who haven't ordered in 30+ days with a special offer
• Upsell complementary products at checkout (e.g., "Customers also bought")
• Run targeted promotions on your best-performing products during peak hours

**Key metrics to watch daily:**
• Orders placed today vs. yesterday (growth rate)
• Average order value — aim to increase it steadily
• Cart abandonment rate — if high, consider free shipping or exit-intent discounts
• Returning customer rate — repeat buyers are your most profitable segment

Would you like me to go deeper into any of these areas?`,
  },

  // ═════════════ TOP PRODUCTS ═════════════
  {
    id: 'top_products',
    label: 'Best-Selling Products',
    keywords: [
      ['how to', 5], ['how do', 5], ['what is', 4], ['explain', 4],
      ['help', 3], ['guide', 3], ['tutorial', 4], ['walkthrough', 4],
      ['feature', 3], ['function', 2], ['purpose', 2], ['use', 2],
      ['started', 3], ['beginner', 3], ['overview', 3], ['introduction', 3],
      ['tell me about', 4], ['show me', 3], ['learn', 3],
      ['how does', 4], ['what does', 4], ['what can', 4], ['what do', 3],
      ['how do i', 5], ['how can i', 5], ['how to use', 5],
      ['how does this', 4], ['what can you', 4], ['what can this', 4],
    ],
    respond: (msg, ent) => `🏆 **Best-Selling Products:**

Your **Dashboard** → **Top Products** section shows exactly which items are driving the most revenue.

**How to identify winners:**
• Sort by **revenue generated** (not just units sold) — high-value items matter more
• Check **reorder frequency** — products customers repeatedly buy are strong performers
• Look at **profit margin per unit** — a $50 product at 40% margin beats ten $5 products at 10%

**To boost your best-sellers further:**
• Keep them **always in stock** — a stockout of a top seller hurts reputation and revenue
• Feature them on your shop's **homepage and category banners**
• Create **bundles** with slower-moving products to move inventory
• Ask happy customers for **reviews** — social proof drives more sales
• Run targeted **"back in stock" notifications** for when they're available

**Watch out for:**
• Products that were best-sellers but are declining — update their marketing or phase them out
• Seasonal spikes — stock up before peak seasons for your top products`,
  },

  // ═════════════ INVENTORY / STOCK ═════════════
  {
    id: 'inventory',
    label: 'Inventory & Stock',
    keywords: [
      ['stock', 5], ['inventory', 5], ['restock', 6], ['reorder', 5],
      ['out of stock', 6], ['low stock', 6], ['stock level', 6],
      ['stockout', 5], ['stock out', 5], ['warehouse', 4],
      ['supply', 3], ['quantity', 3], ['units left', 4],
      ['reorder point', 6], ['safety stock', 6], ['lead time', 5],
      ['inventory level', 6], ['stock count', 5], ['stock alert', 5],
    ],
    respond: (msg, ent) => `📦 **Inventory Management:**

Your **Inventory** page shows all stock levels at a glance, with alerts for low-stock items.

**Key formulas:**
• **Reorder Point** = (Average Daily Sales × Lead Time) + Safety Stock
• **Safety Stock** = (Max Daily Sales − Average Daily Sales) × Lead Time
• **Example:** If you sell 10 units/day and lead time is 3 days, reorder when stock hits 30

**Action steps:**
• Products with **stock ≤ 20 units** are flagged as Low Stock automatically
• Use the **Demand Forecast** page to predict 30–90 day needs per product
• Set **custom reorder points** per product in the Products page
• Check the **Expiry Tracker** page to avoid selling expired goods
• Run **cycle counts** weekly to keep inventory data accurate

**Prevent stockouts without over-ordering:**
• Use ABC analysis: A-items (high value) need tighter monitoring
• Track seasonal demand — order more before peak seasons
• Negotiate with suppliers for smaller, more frequent deliveries to reduce holding cost
• Monitor your **best-sellers** daily, not weekly — they need constant attention

**If you have slow-moving inventory:**
• Bundle them with best-sellers
• Run targeted buy-one-get-one promotions
• Discount 10–20% to clear space`,
  },

  // ═════════════ PRICING ═════════════
  {
    id: 'pricing',
    label: 'Pricing Strategy',
    keywords: [
      ['pric', 5], ['pricing', 6], ['discount', 5], ['competitor price', 6],
      ['competitor', 5], ['margin', 5], ['profit margin', 6], ['markup', 4],
      ['price point', 5], ['price range', 5], ['retail price', 5],
      ['wholesale price', 5], ['dynamic pricing', 6], ['cost price', 5],
      ['selling price', 5], ['sale price', 5], ['price strategy', 6],
      ['price competit', 5], ['expensive', 3], ['cheap', 3], ['overpriced', 4],
      ['underpriced', 4], ['pricing strategy', 6], ['fair price', 4],
      ['how much should i charge', 5], ['what price', 4],
    ],
    respond: (msg, ent) => `💰 **Pricing Strategy:**

The **Smart Pricing** page uses AI to analyze your cost, stock, and competitor prices.

**Core pricing rules:**
• **Never price below Cost × 1.15** — that's your minimum 15% margin
• **Suggested Price** = midpoint between (Cost × 1.15) and (Competitor High × 1.20)
• **High stock + low demand** → lower price by 5–10% to move inventory
• **Low stock + high demand** → you can raise price by 5–8%
• **Rating above 4.5★** → allows you to charge a premium of 5–8%
• **Rating below 3.5★** → needs a discount to compete

**Competitor-aware pricing:**
• Track 3–5 competitors minimum for meaningful comparison
• Don't price more than 15% above your competitor average unless your rating justifies it
• Match competitor pricing on commodity items; differentiate on value-added products
• Consider psychological pricing ($49.99 vs $50) for retail buyers

**Margin optimization:**
• Target **30–50% gross margin** for sustainable growth
• Use bundle pricing to move low-margin items with high-margin ones
• Review supplier prices quarterly — negotiate better rates as volume grows

**When to discount:**
• End-of-season clearance
• Excess stock (holding cost exceeds discount cost)
• Competitive response for price-sensitive items
• Customer acquisition (first-order discounts) — but track LTV to ensure profitability`,
  },

  // ═════════════ CUSTOMERS / SEGMENTS ═════════════
  {
    id: 'customers',
    label: 'Customers & Segmentation',
    keywords: [
      ['customer', 5], ['churn', 6], ['loyal', 5], ['loyalty', 5], ['segment', 5],
      ['vip', 5], ['buyer', 4], ['repeat purchase', 6], ['repeat buyer', 6],
      ['retention', 5], ['retain', 4], ['acquire', 3], ['acquisition', 4],
      ['new customer', 5], ['existing customer', 5], ['returning customer', 5],
      ['customer behavior', 5], ['customer profile', 4], ['buying pattern', 5],
      ['purchase pattern', 5], ['customer segment', 5], ['target audience', 4],
      ['demographic', 3], ['consumer', 3], ['client', 3], ['who buy', 4],
    ],
    respond: (msg, ent) => `👥 **Customer Segmentation & Retention:**

Your customers are automatically grouped into **4 segments** in the **Segments** page:

• 🆕 **New** — first-time buyers (0-1 orders) → send welcome offers and onboarding
• 🔄 **Occasional** — buy occasionally (2-3 orders) → respond well to reminders and discounts
• ✅ **Regular** — consistent buyers (4-9 orders) → reward loyalty and offer membership perks
• 👑 **VIP** — top spenders (10+ orders) → **15% discount + free shipping** applied automatically

**To reduce customer churn:**
• Identify at-risk customers: haven't ordered in 30+ days
• Send **"We miss you"** offers with exclusive discounts
• Follow up on **abandoned carts** with reminders within 24 hours
• Ask for **feedback** after delivery — address issues promptly
• Track **repeat purchase rate** — if declining, your quality or service may be slipping

**To increase repeat purchases:**
• Send **post-purchase follow-ups** with product recommendations
• Create a **loyalty program** — points, tiers, exclusive perks
• Use **reorder reminders** for consumable products (coffee, cosmetics, etc.)
• Offer **subscription options** for frequently purchased items
• Remember customer preferences and suggest relevant products

**VIP treatment tips:**
• Prioritize VIP orders for faster delivery
• Give early access to new products and sales
• Provide dedicated support — VIPs should never wait
• Surprise them with occasional free gifts or upgrades`,
  },

  // ═════════════ ORDERS / DELIVERY ═════════════
  {
    id: 'orders',
    label: 'Orders & Fulfillment',
    keywords: [
      ['order', 5], ['delivery', 5], ['deliver', 5], ['ship', 5], ['shipping', 5],
      ['fulfil', 4], ['fulfill', 4], ['checkout', 4], ['payment', 4], ['pay', 4],
      ['refund', 4], ['return', 4], ['cancel', 3], ['cancellation', 4],
      ['track order', 6], ['order status', 6], ['order history', 5],
      ['invoice', 4], ['receipt', 4], ['tracking', 5], ['order tracking', 6],
      ['where is my order', 6], ['order placed', 4], ['processing order', 4],
      ['shipment', 5], ['package', 3], ['parcel', 3], ['transaction', 3],
      ['manage order', 6], ['manage pending order', 7], ['pending order', 6],
      ['pending orders', 6], ['handle order', 5], ['handle orders', 5],
      ['manage my orders', 6], ['process order', 5], ['process orders', 5],
    ],
    respond: (msg, ent) => `📋 **Orders & Fulfillment:**

All orders are managed on the **Orders** page — filter by status (pending, processing, shipped, delivered).

**Order lifecycle:**
1. **Pending** — order received, payment confirmed, awaiting processing
2. **Processing** — items being picked and packed
3. **Shipped** — package handed to courier, tracking number issued
4. **Delivered** — customer confirmed receipt

**What the system does automatically:**
• Stock is deducted when an order is placed (COD and paid orders both)
• Real-time **new-order notification** appears on the bell icon
• VIP customers automatically get **15% discount + free express shipping**
• Order history is tracked per customer for reorder predictions

**Managing orders efficiently:**
• Prioritize orders containing **low-stock items** — they're at risk of stockouts
• Update status promptly so customers see progress
• Handle **refunds/returns** quickly — fast resolution increases customer trust by 40%
• For **COD orders**, confirm delivery before marking as delivered
• Batch-process orders by region to optimize delivery routes

**Common issues:**
• **Failed payments** — contact customer within 24 hours
• **Delayed delivery** — proactively notify and offer partial refund or discount
• **Damaged items** — process replacement immediately

${ent.orderId ? `\n**About ${ent.orderId}:**\n• Check the Orders page and search for that order ID\n• You can view status, customer details, and item list there` : ''}`,
  },

  // ═════════════ DEMAND FORECAST ═════════════
  {
    id: 'forecast',
    label: 'Demand Forecasting',
    keywords: [
      ['forecast', 6], ['demand', 5], ['predict', 5], ['prediction', 5],
      ['trend', 4], ['future', 3], ['projection', 4], ['projected', 4],
      ['estimate', 3], ['anticipated', 3], ['expected demand', 5],
      ['sales forecast', 6], ['demand planning', 5], ['demand forecast', 6],
      ['how much will i sell', 5], ['future sales', 5], ['next month', 3],
    ],
    respond: (msg, ent) => `📈 **Demand Forecasting:**

Go to **Demand Forecast** page to see AI-powered sales predictions for any product.

**How it works:**
• Uses your **sales history** (14–90 days) to detect patterns
• **Trend analysis**: increasing, decreasing, or stable
• Generates daily predictions with **confidence ranges** (lower/upper bounds)
• Recommendations follow: **Net Need = Predicted Demand − Current Inventory**

**Understanding trends:**
• 📈 **Increasing** → stock up 15% above forecast total to avoid stockouts
• 📉 **Decreasing** → reduce next order by 10–15% to avoid overstock
• ➡️ **Stable** → maintain current stock + 1 week safety buffer

**Best practices:**
• Use **30-day forecast** for operational planning (reorders)
• Use **90-day forecast** for strategic decisions (supplier contracts, hiring)
• Factor in **seasonality** (holidays, school seasons, rainy season, etc.)
• Regularly update forecasts with real sales data
• Combine with **Expiry Tracking** — don't over-order perishable items

**What to do with the forecast:**
• Set **reorder points** based on predicted daily demand
• Negotiate bulk purchase discounts from suppliers based on 90-day projections
• Allocate marketing budget to products with rising demand
• Clear out inventory of products with declining demand

**Limitations:** Historical data can't predict unexpected events. Use judgment for new products, major promotions, or supply disruptions.`,
  },

  // ═════════════ PRODUCT AI ═════════════
  {
    id: 'product_ai',
    label: 'Product AI Features',
    keywords: [
      ['product ai', 6], ['description generator', 6], ['generate description', 6],
      ['photo catalog', 6], ['image catalog', 5], ['photo cataloging', 6],
      ['product description', 5], ['auto description', 5], ['write description', 5],
      ['write a good product description', 7], ['write good product description', 7],
      ['write a product description', 7], ['writing product description', 6],
      ['smart fill', 5], ['detect product', 5], ['ai generat', 4],
      ['ai write', 4], ['ai description', 5], ['description for', 4],
      ['seo tag', 4], ['bullet point', 4], ['product photo', 5],
      ['upload product photo', 7], ['upload product image', 7], ['upload a product photo', 7],
      ['upload a product image', 7], ['product image', 4], ['upload photo', 5], ['upload image', 5],
      ['catalog', 4], ['cataloging', 5], ['product search', 3],
      ['image search', 4], ['visual search', 4],
    ],
    respond: (msg, ent) => `🤖 **Product AI — Full Guide:**

**1. Description Generator ✍️**
• Go to **Product AI** → **Demo Description** tab
• Select a product OR type any product name manually
• Click **Smart Fill** to auto-detect category and features
• Click **Generate Description** → AI writes:
  - Short description (1 sentence)
  - Long description (3 paragraphs)
  - 5 bullet points with specific specs
  - 6 SEO keywords for search ranking
• Works even without a Gemini key — smart template fallback included

**2. Photo Cataloging 📷**
• Go to **Product AI** → **Photo Catalog** tab
• Upload any product image (drag & drop or click to browse)
• AI Vision detects: product name, category, tags, description, price range
• Click **"→ Use This Data in Description Generator"** to pre-fill the form
• Recognizes books, shoes, electronics, clothing, food, and more

**3. Image Search 🔍**
• Type a product name → get up to 6 AI-generated product images
• Useful for creating catalog images without photography
• Click any image to select → download for your listing

**4. Visual Search (Customer side) 🔍**
• Customers upload a photo to find similar products in your catalog
• Uses the Python AI service (FastAPI) for similarity matching

${ent.productName ? `\n**About "${ent.productName}":**\n• Open Product AI page → Description Generator\n• Click "Smart Fill" with that product name to auto-detect category/features\n• Generate a full description in seconds!` : ''}`,
  },

  // ═════════════ FEEDBACK / REVIEWS ═════════════
  {
    id: 'feedback',
    label: 'Feedback & Reviews',
    keywords: [
      ['feedback', 5], ['review', 5], ['complaint', 5], ['suggestion', 4],
      ['rating', 4], ['star', 3], ['testimonial', 4], ['kudos', 4],
      ['compliment', 4], ['custom feedback', 5], ['customer feedback', 5],
      ['feedback management', 5], ['respond to feedback', 5],
      ['reply to review', 4], ['bad review', 5], ['good review', 4],
    ],
    respond: (msg, ent) => `💬 **Feedback Management:**

Your **Feedback** page shows all customer messages with reply functionality.

**Key features:**
• Customers can leave feedback **anonymously** — no account needed
• Real-time badge alerts when new feedback arrives
• Reply directly from the feedback page — customers see your response on their side
• Internal notes for your team (not visible to customers)

**Best practices:**
• **Reply within 24 hours** — fast responses increase trust by 40%
• Acknowledge the issue before explaining — "I understand this was frustrating…"
• Offer a concrete resolution — replacement, refund, or discount
• Use feedback patterns to identify systemic issues:
  - Multiple complaints about shipping → review your courier
  - Repeated product quality issues → talk to the supplier
  - Praise for certain products → feature them more prominently

**Sample response templates:**
• Complaint: *"Thank you for bringing this to our attention. I've escalated this to our team and we'll make it right. Here's what we'll do…"*
• Suggestion: *"Great idea! We're actually working on this. Meanwhile, here's a workaround…"*
• Positive: *"Thank you so much for your kind words! We've shared your feedback with the team."*

**Turn negative feedback into loyalty:**
• Follow up after resolution to confirm satisfaction
• Offer a small goodwill gesture (10% off next order)
• A resolved complaint creates a more loyal customer than someone who never complained`,
  },

  // ═════════════ DASHBOARD / ANALYTICS ═════════════
  {
    id: 'analytics',
    label: 'Dashboard & Analytics',
    keywords: [
      ['dashboard', 4], ['analytic', 5], ['analytics', 5], ['statistic', 4],
      ['statistics', 4], ['data', 3], ['metric', 5], ['metrics', 5],
      ['kpi', 6], ['kpis', 6], ['report', 4], ['reports', 4],
      ['insight', 4], ['insights', 4], ['overview', 3], ['summary', 3],
      ['numbers', 3], ['performance', 3], ['chart', 3], ['graph', 3],
    ],
    respond: (msg, ent) => `📊 **Dashboard & Analytics Overview:**

Your **Dashboard** gives a complete business snapshot:

**Main metrics shown:**
• **Revenue** — today, this week, this month (with trend)
• **Orders** — count by status (pending, processing, shipped, delivered)
• **Top Products** — best-sellers ranked by revenue
• **Customer Segments** — new, occasional, regular, VIP distribution
• **Recent Orders** — latest transactions with customer details
• **Low Stock Alerts** — products needing immediate reorder

**Key KPIs to track daily:**
1. **Revenue Growth** — today vs. yesterday, week-over-week
2. **Order Volume** — is traffic converting to orders?
3. **Average Order Value (AOV)** — total revenue ÷ orders
4. **Conversion Rate** — orders ÷ visits
5. **Inventory Turnover** — how fast are you selling through stock?
6. **Repeat Purchase Rate** — % of customers who come back
7. **Customer Acquisition Cost** — marketing spend ÷ new customers

**Interpreting the numbers:**
• Revenue up but orders down? → AOV increased (good!)
• Orders up but revenue flat? → customers buying cheaper items (analyze why)
• Low stock on best-sellers? → prioritize restocking NOW
• VIP segment shrinking? → focus on retention campaigns

**For deeper analysis:**
• **Segments page** — customer behavior breakdown
• **Demand Forecast** — future sales predictions
• **Revenue page** — detailed revenue analytics`,
  },

  // ═════════════ EXPIRY TRACKER ═════════════
  {
    id: 'expiry',
    label: 'Expiry Tracking',
    keywords: [
      ['expiry', 6], ['expire', 6], ['expiration', 6], ['expiring', 6],
      ['expired', 5], ['shelf life', 5], ['expiry date', 6], ['expiring soon', 6],
      ['expired product', 5], ['food expiry', 5], ['perishable', 4],
      ['product expiry', 5], ['expiration date', 6],
    ],
    respond: (msg, ent) => `⏰ **Expiry Tracking:**

The **Expiry Tracker** page monitors all products with expiry dates.

**How it works:**
• Products with **expiry dates** are tracked automatically
• Alerts are sent at **7 days** and **15 days** before expiry
• **Fully expired** products are flagged for immediate action
• Real-time notifications appear on the dashboard bell icon

**Best practices:**
1. **Set expiry dates** when adding products (especially food, cosmetics, medicine)
2. **Check the tracker daily** — especially for perishable categories
3. **Act before expiry:**
   - 15+ days left → run a **discount promotion** to move stock
   - 7 days left → aggressive clearance pricing (30–50% off)
   - Expired → remove from store immediately, don't sell
4. **Prevent waste:**
   - Order smaller quantities of perishables more frequently
   - Use FIFO method (first-in, first-out) in storage
   - Track expiry data in the **Demand Forecast** to align orders with consumption

**Reporting:**
The system logs expiring products and sends email notifications to admin and vendors for proactive management.`,
  },

  // ═════════════ REORDER PREDICTION ═════════════
  {
    id: 'reorder_prediction',
    label: 'Re-order Prediction',
    keywords: [
      ['reorder', 5], ['re-order', 5], ['reorder prediction', 6], ['re-order ai', 6],
      ['when will they buy', 5], ['buy again', 5], ['purchase again', 5],
      ['predict when', 4], ['next purchase', 5], ['next order', 4],
      ['repeat order', 5], ['reorder date', 5], ['reorder suggested', 5],
      ['reorder recommendation', 5],
    ],
    respond: (msg, ent) => `🔄 **Re-order Prediction (Re-order AI):**

The **Re-order AI** page predicts when each customer will buy again.

**How it works:**
• Analyzes each customer's **order history** — frequency, intervals, products bought
• Identifies products they **purchase repeatedly** (at least 2 times)
• Calculates **average days between orders** per product
• Predicts the **next reorder date** with confidence scoring
• Gives a brief **reason** for each suggestion

**For each customer you'll see:**
• Suggested reorder date (e.g., "2025-03-15")
• Confidence level (high/medium/low)
• Average days between orders (e.g., "every 28 days")
• Which specific products are due for reorder

**How to use it:**
1. Go to **Customer Dashboard** → **Re-order AI** page
2. Review the list of suggested reorders
3. Send **reminder messages** to customers before their predicted reorder date
4. Create **"back in stock"** alerts for products they'll likely reorder
5. Offer a **subscribe & save** option for consumables

**Pro tip:** Pair reorder predictions with your **Customer Segments** — VIP customers with pending reorders are highest priority for outreach.`,
  },

  // ═════════════ VISUAL SEARCH ═════════════
  {
    id: 'visual_search',
    label: 'Visual Search',
    keywords: [
      ['visual search', 6], ['image search', 5], ['photo search', 5],
      ['search by image', 6], ['find similar', 5], ['similar product', 5],
      ['upload photo find', 5], ['search with photo', 5], ['search with image', 5],
      ['picture search', 4], ['reverse image', 4], ['visual', 3],
    ],
    respond: (msg, ent) => `🔍 **Visual Search:**

Customers can find products by **uploading a photo** instead of typing.

**How it works (customer side):**
1. Customer goes to **Visual Search** page
2. Uploads an image of a product they want (e.g., shoes they saw on the street)
3. The system uses **AI image recognition** (Python FastAPI service) to analyze the photo
4. Returns visually similar products from your catalog

**For you as admin/vendor:**
• This feature appears in the **Customer** portal (not admin)
• Requires the **Python AI service** to be running: \`cd ai-services && python main.py\`
• Works best when your product catalog has **high-quality product photos**
• The more products you have with clear images, the better the search results

**Tips to improve visual search:**
• Use consistent product photography (white backgrounds)
• Upload multiple angles of each product
• Ensure product names and categories are accurate
• Add good SEO tags to every product
• Keep the product catalog up to date

**Alternative:** For quick image-based product detection, use **Product AI** → **Photo Catalog** page (works without the Python service).`,
  },

  // ═════════════ SHOPPING / STOREFRONT ═════════════
  {
    id: 'shopping',
    label: 'Storefront & Shopping',
    keywords: [
      ['shop', 4], ['store', 3], ['storefront', 4], ['browse', 3],
      ['catalog', 3], ['product page', 3], ['buy product', 4],
      ['add to cart', 4], ['cart', 3], ['wishlist', 3], ['featured', 3],
      ['category', 3], ['filter', 3], ['search product', 4],
      ['find product', 4], ['shopping', 4], ['store page', 3],
    ],
    respond: (msg, ent) => `🛍️ **Storefront & Shopping:**

The customer **Shop** page offers a full shopping experience.

**Features available:**
• Browse all products with **category filters** (Electronics, Clothing, Home & Garden, etc.)
• **Search bar** to find products by name or keyword
• Product details with photos, descriptions, pricing, and stock availability
• **Add to Cart** with quantity adjustment
• VIP customers see **15% discount** applied automatically
• **Secure checkout** with multiple payment options (including COD)
• Order confirmation with order ID for tracking

**To optimize your storefront:**
• Add **high-quality product photos** to every listing
• Write **complete descriptions** (use Product AI to generate them)
• Set **competitive prices** using Smart Pricing
• Keep **stock levels** visible and accurate
• Feature your **best-sellers** prominently

**Customer journey:**
Browse → Product view → Add to cart → Checkout → Order confirmation → Delivery → Feedback

**To drive more sales:**
• Keep the catalog fresh with new products
• Promote via **customer segments** — VIPs get first look
• Use **Reorder AI** to remind customers to reorder consumables`,
  },

  // ═════════════ USERS / AUTH ═════════════
  {
    id: 'users',
    label: 'Users & Accounts',
    keywords: [
      ['user', 4], ['account', 4], ['login', 3], ['logout', 3], ['register', 3],
      ['sign up', 3], ['sign in', 3], ['password', 3], ['profile', 4],
      ['role', 3], ['admin', 3], ['vendor', 4], ['customer account', 4],
      ['create account', 4], ['reset password', 4], ['forgot password', 4],
      ['change password', 4], ['user management', 4],
    ],
    respond: (msg, ent) => `👤 **Users & Account Management:**

**Account roles:**
• 👑 **Admin** — full access: manage everything, see all analytics, configure system
• 🏪 **Vendor** — manage products, orders, inventory, pricing, and their own analytics
• 🛍️ **Customer** — shop, track orders, reorder, get AI support

**Admin features:**
• View all customers and their purchase history
• Manage vendor registrations
• Configure system settings (invite codes, etc.)

**Vendor features:**
• Add/edit/delete products
• Process orders
• Run demand forecasts and smart pricing
• Respond to customer feedback

**Customer features:**
• Browse shop and place orders
• Track orders and view order history
• AI-assisted shopping and support
• Provide feedback and manage profile

**Registration:**
• **Admin/Vendor** registrations require specialize invite codes
• **Customer** registration is open to anyone

**Security:**
• All passwords are **hased** (bcrypt)
• Tokens expire after 7 days — you'll need to re-login
• Sessions are managed via JWT tokens`,
  },

  // ═════════════ GENERAL HELP / HOW TO ═════════════
  {
    id: 'help',
    label: 'General Help & Guide',
    keywords: [
      ['stock', 5], ['inventory', 5], ['restock', 6], ['reorder', 5],
      ['out of stock', 6], ['low stock', 6], ['stock level', 6],
      ['stockout', 5], ['stock out', 5], ['warehouse', 4],
      ['supply', 3], ['quantity', 3], ['units left', 4],
      ['reorder point', 6], ['safety stock', 6], ['lead time', 5],
      ['inventory level', 6], ['stock count', 5], ['stock alert', 5],
      ['track inventory', 7], ['track my inventory', 7], ['track stock', 6],
      ['check inventory', 6], ['check my inventory', 6], ['manage inventory', 6],
      ['inventory management', 6], ['manage my inventory', 6],
    ],
    respond: (msg, ent) => `💡 **AI Commerce — Feature Guide:**

Here's everything you can do with this platform:

**For Admins & Vendors:**
• 📊 **Dashboard** — sales overview, top products, revenue charts, customer segments
• 📋 **Orders** — manage orders, update status, view customer details
• 📦 **Inventory** — track stock, set reorder points, view low-stock alerts
• ⏰ **Expiry Tracker** — monitor products approaching their expiry date
• 💰 **Smart Pricing** — AI-powered price recommendations with competitor analysis
• 🤖 **Product AI** — auto-generate descriptions, catalog photos, AI image search
• 📈 **Demand Forecast** — predict future sales for any product with trends
• 📊 **Segments** — view customer groups (VIP, Regular, Occasional, New) and their behavior
• 💬 **Feedback** — manage customer feedback, reply, and track satisfaction
• ⚡ **AI Chat** — conversational assistant for business questions

**For Customers:**
• 🛍️ **Shop** — browse products, search, filter by category
• 💬 **AI Assistant** — support with orders, returns, products, and more
• 🔍 **Visual Search** — upload a photo to find similar products
• 💳 **Checkout** — secure payment (including COD), order tracking
• 🔄 **Re-order AI** — smart predictions for your next purchase
• 💬 **Feedback** — share thoughts and ratings
• 👤 **Profile** — manage your account and preferences

**Quick starting tips:**
• Use the **navigation sidebar** to access all features
• Click the ⚡ **floating AI button** (bottom-right) for instant help anywhere
• Check the **notification bell** for real-time alerts
• Demo accounts: admin@demo.com / vendor@demo.com / customer@demo.com (password: demo123)

Ask me about any specific feature — I can guide you step by step!`,
  },

  // ═════════════ FEATURE REQUEST / SUGGESTION ═════════════
  {
    id: 'suggestion',
    label: 'Suggestions & Ideas',
    keywords: [
      ['suggest', 4], ['recommend', 4], ['idea', 3], ['improve', 4],
      ['improvement', 4], ['optimize', 4], ['optimize', 3], ['better', 3],
      ['strategy', 5], ['strategies', 5], ['ways to', 4], ['tips', 4],
      ['best way', 4], ['best practice', 4], ['how can i improve', 5],
      ['what should i', 4], ['what can i do', 4], ['what would', 3],
    ],
    respond: (msg, ent) => `💡 **Business Improvement Suggestions:**

Here are actionable strategies based on common e-commerce goals:

**To increase sales:**
• Run targeted promotions on your **top 20% of products** during peak shopping hours
• Bundle complementary products (e.g., phone + case + screen protector)
• Offer **free shipping** above a threshold to increase average order value
• Create **urgency** with limited-time offers and countdown timers
• Follow up with **abandoned cart** reminders within 24 hours (recover 10-15% of carts)

**To improve customer experience:**
• Respond to feedback and reviews within 24 hours
• Ensure fast, reliable delivery — track delivery times and optimize routes
• Make returns/refunds effortless — a frictionless return policy builds trust
• Personalize product recommendations based on purchase history
• Offer multiple payment options (card, mobile money, COD)

**To optimize operations:**
• Use **Demand Forecast** to align orders with actual demand — reduce overstocking
• Set **reorder points** on all products to prevent stockouts
• Track **expiry dates** — expired inventory is pure loss
• Review **pricing margins** quarterly — ensure minimum 15-20% margin
• Segment customers to tailor marketing and offers

**Which area would you like to dive deeper into? I can give specific, step-by-step guidance for:**
• Sales & revenue growth
• Inventory optimization
• Pricing strategy
• Customer retention
• Marketing & promotions`,
  },
];

// ── Greeting responses ───────────────────────────────────────────────────────
function handleGreeting(msg) {
  const m = msg.toLowerCase().trim();
  const isAmharic = /(ሰላም|ሰላማት|ታዴስ|እንደምን|እንዴት|ደህና)/.test(m);
  const time = new Date().getHours();
  const timeGreeting = time < 12 ? 'Good morning' : time < 17 ? 'Good afternoon' : 'Good evening';

  if (isAmharic) {
    return `ሰላም! 👋 እኔ የእርስዎ AI ረዳት ነኝ ለ AI Commerce።

በሚከተሉት ጉዳዮች ልረዳዎት እችላለሁ፡
• 📊 የሽያጭ ትንተና እና የገቢ እድገት
• 📦 የእቃ አያያዝ እና ዳግም ማከማቸት
• 💰 የዋጋ አወሳሰን ስልት
• 👥 የደንበኞች ክፍፍል እና እንክብካቤ
• 📈 የፍላጎት ትንበያ

ምን መጠየቅ ይፈልጋሉ?`;
  }

  return `${timeGreeting}! 👋 I'm your AI business assistant for **AI Commerce**.

I can help you with:
• 📊 **Sales analysis & revenue growth**
• 📦 **Inventory management & restocking**
• 💰 **Pricing strategy & competitor analysis**
• 👥 **Customer segmentation & retention**
• 📈 **Demand forecasting & predictions**
• 📋 **Order management & fulfillment**
• 🤖 **Product AI features**

What would you like to know?`;
}

// ── Thank you / farewell ─────────────────────────────────────────────────────
function handleClosing(msg) {
  const m = msg.toLowerCase().trim();
  if (/(thank|thanks|thx|በጣም|አመሰግናለሁ|appreciate|grateful)/.test(m)) {
    return `You're welcome! 😊 I'm here 24/7 to help with any business questions.

Feel free to ask about:
• 📊 Sales & revenue strategies
• 📦 Inventory and restocking
• 💰 Pricing recommendations
• 👥 Customer engagement
• 📈 Forecasting and trends

Is there anything else I can help you with?`;
  }
  if (/(bye|goodbye|see you|later|ቻው|ጤና|በህና)/.test(m)) {
    return `Goodbye! 👋 Wishing you great sales today!

Remember where to find me: click the **⚡** button (bottom-right) anytime you need help.

Come back soon! 🚀`;
  }
  return null;
}

// ── Entity extraction ────────────────────────────────────────────────────────
function extractEntities(msg) {
  const ent = {};
  const m = msg.toLowerCase();

  // Extract product names (words after "product", "item", etc.)
  const productMatch = m.match(/(?:product|item|product name)\s*['":=]?\s*["']?([a-zA-Z0-9\s]{2,40})["']?/);
  if (productMatch && productMatch[1].trim().length > 1) {
    ent.productName = productMatch[1].trim();
  }

  // Extract order IDs (ORD-xxx, #xxx, order number)
  const orderMatch = m.match(/\b(ord[-_ ]?\d+|order\s*#?\s*\d+|\d{4,})/i);
  if (orderMatch) ent.orderId = orderMatch[1].replace(/\s+/g, '').toUpperCase();

  // Extract numbers / amounts
  const amountMatch = m.match(/\$\s*(\d+(?:\.\d+)?)/);
  if (amountMatch) ent.amount = parseFloat(amountMatch[1]);

  const qtyMatch = m.match(/(\d+)\s*(?:units|items|pieces|products)/i);
  if (qtyMatch) ent.quantity = parseInt(qtyMatch[1]);

  // Extract customer names
  const customerMatch = m.match(/(?:customer|customer named?|user named?|client)\s+(?:called|named)?\s*["']?([A-Z][a-zA-Z\s]{1,30})["']?/);
  if (customerMatch) ent.customerName = customerMatch[1].trim();

  return ent;
}

// ── Amharic support ──────────────────────────────────────────────────────────
function handleAmharic(msg) {
  const m = msg.toLowerCase().trim();

  // እቃ/ክምችት (inventory/stock)
  if (/(እቃ|ክምችት|ማከማቸት|አክሲዮን|ስቶክ)/.test(m)) {
    return `📦 **የእቃ አያያዝ መረጃ:**

• **የድጋሚ ትዕዛዝ ነጥብ** = አማካይ ዕለታዊ ሽያጭ × የጊዜ ወሰን + የደህንነት ክምችት
• **ዝቅተኛ ክምችት** (≤ 20 ክፍሎች) → ወዲያው ያዙ። በ **Inventory** ገጽ ይታያል
• **Demand Forecast** ገጽን ተጠቀሙ ለቀጣይ 30-90 ቀናት ትንበያ
• **Expiry Tracker** ገጽ እየጠፉ ያሉ እቃዎችን ያሳያል

ለተጨማሪ መረጃ በእንግሊዝኛ ሊጠይቁ ይችላሉ።`;
  }

  // ዋጋ (price)
  if (/(ዋጋ|ዋጋዎች|ቅናሽ|ገበያ)/.test(m)) {
    return `💰 **የዋጋ ስልት:**

• **Smart Pricing** ገጽ — AI ዋጋ ይመክራል (ከወጪ፣ ክምችት፣ ተወዳዳሪ ዋጋ ጋር)
• **ዝቅተኛ ዋጋ** = ወጪ × 1.15 (15% ትርፍ መጠን ይሁን)
• **ከፍተኛ ክምችት + ዝቅተኛ ፍላጎት** → ዋጋን በ5-10% ዝቅ ያድርጉ
• **ዝቅተኛ ክምችት + ከፍተኛ ፍላጎት** → ዋጋን በ5-8% ከፍ ማድረግ ይቻላል`;
  }

  // ደንበኞች (customers)
  if (/(ደንበኞች|ደንበኛ|ደንበኞችን)/.test(m)) {
    return `👥 **የደንበኞች ክፍፍል:**

ደንበኞችዎ በ4 ክፍሎች ይከፈላሉ፡
• 🆕 **አዲስ** — የመጀመሪያ ገዢዎች
• 🔄 **አልፎ አልፎ** — አልፎ አልፎ የሚገዙ
• ✅ **መደበኛ** — በተከታታይ የሚገዙ
• 👑 **VIP** — ከፍተኛ ገንዘብ የሚያወጡ → 15% ቅናሽ + ነፃ ማጓጓዝ

**Segments** ገጽ ላይ ሁሉንም ዝርዝር ይመልከቱ።`;
  }

  // ሽያጭ / ገቢ (sales/revenue)
  if (/(ሽያጭ|ገቢ|ሽያጮች|እድገት)/.test(m)) {
    return `📊 **የሽያጭ እና ገቢ ትንተና:**

• **Dashboard** ገጽ ላይ የዛሬ፣ የሳምንት፣ እና የወር ገቢን ይመልከቱ
• **Top Products** — ከፍተኛ ገቢ የሚያስገኙ ምርቶች
• **80/20 ህግ** — 20% ምርቶች 80% ገቢ ያስገኛሉ
• **እንቅስቃሴ የሌላቸውን እቃዎች** ከተገዢ ምርቶች ጋር ያስራሉ

ለበለጠ መረጃ በእንግሊዝኛ ይጠይቁ።`;
  }

  // እንዴት (how to)
  if (/(እንዴት|እንደምን|ምን እንደሆነ)/.test(m)) {
    return `💡 **AI Commerce መመሪያ:**

ዋና ዋና ገጾች፡
• 📊 **Dashboard** — የሽያጭ አጠቃላይ እይታ
• 📋 **Orders** — ትዕዛዝን ያስተዳድሩ
• 📦 **Inventory** — የእቃ ክምችት ይቆጣጠሩ
• 💰 **Smart Pricing** — AI ዋጋ መከሪያ
• 🤖 **Product AI** — የምርት መግለጫ አመንጪ
• 📈 **Demand Forecast** — የፍላጎት ትንበያ
• ⚡ **AI Chat** — ረዳት ውይይት

ማንኛውንም ተጨማሪ ጥያቄ በእንግሊዝኛ ወይም በአማርኛ መጠየቅ ይችላሉ!`;
  }

  return null;
}

// ── Default response when no topic matches ──────────────────────────────────
function defaultResponse(msg) {
  const m = msg.toLowerCase().trim();

  // Questions about "what/how/who/where/when/why"
  if (/(what|how|who|where|when|why|which)/.test(m)) {
    return `I'd like to give you the most accurate answer! Let me help you narrow it down.

I'm most knowledgeable about these **e-commerce topics**:

📊 **Sales & Revenue** — "How do I grow my monthly revenue?"
📦 **Inventory** — "When should I restock a product?"
💰 **Pricing** — "How do I price competitively?"
👥 **Customers** — "How do I keep my VIP customers engaged?"
📈 **Forecasting** — "What will demand be next month?"
🤖 **Product AI** — "How does the description generator work?"
📋 **Orders** — "How do I manage pending orders?"
💬 **Feedback** — "How should I reply to a bad review?"

Could you rephrase your question including one of these topics? For example: *"How do I improve my pricing strategy?"*`;
  }

  // Short / unclear messages
  if (m.length < 5) {
    return `Hi! I want to make sure I give you the right answer. Could you tell me a bit more about what you need?

Try asking something like:
• "How do I increase sales?"
• "When should I restock products?"
• "What's my best-selling item?"
• "How does demand forecasting work?"`;
  }

  // Anything else — try to understand intent from common patterns
  return `I understand you're asking about "${msg.slice(0, 100)}${msg.length > 100 ? '…' : ''}".

Here's how I can best help you — I specialize in:

📊 **Sales & Revenue** — strategies to grow income and analyze performance
📦 **Inventory & Stock** — reorder points, stockouts, and inventory optimization  
💰 **Pricing** — competitive pricing, margins, and discount strategies
👥 **Customers** — segmentation, retention, and VIP programs
📈 **Forecasting** — demand prediction and trend analysis
🤖 **Product AI** — descriptions, photo cataloging, and more
📋 **Orders** — order management, fulfillment, and delivery tracking

**To get the most helpful answer**, try asking your question with more context, e.g.:
• *"How do I improve my pricing strategy?"* instead of *"pricing"*
• *"Which products need restocking?"* instead of *"inventory"*

Or ask about any specific feature and I'll walk you through it! 💪`;
}

// ── MAIN ENTRY POINT ─────────────────────────────────────────────────────────
function buildLocalChatReply(message) {
  if (!message || !message.trim()) {
    return "Hi! 👋 I'm your AI assistant. What would you like to know about your e-commerce business?";
  }

  const m = message.toLowerCase().trim();

  // 1. Amharic support
  const amharicReply = handleAmharic(m);
  if (amharicReply) return amharicReply;

  // 2. Quick greetings — check Amharic first (word boundaries don't work well with Unicode)
  if (/^(ሰላም|ሰላማት|ታዴስ|እንደምን|እንዴት|ደህና)\s*/.test(m) && m.length < 50) {
    return handleGreeting(m);
  }

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how r u|selam)\b|^(hi|hello|hey)\s/.test(m) && m.length < 50) {
    return handleGreeting(m);
  }

  // 3. Thanks / bye
  const closingReply = handleClosing(m);
  if (closingReply) return closingReply;

  // 4. Extract entities
  const entities = extractEntities(m);

  // 5. Score topics — find best match(es)
  const scores = {};
  for (const topic of TOPICS) {
    let score = 0;
    for (const [kw, weight] of topic.keywords) {
      if (m.includes(kw)) {
        score += weight;
        // Boost for exact phrase match
        if (m.startsWith(kw) || m.includes(' ' + kw + ' ') || m.endsWith(kw)) {
          score += 2;
        }
      }
    }
    if (score > 0) {
      scores[topic.id] = { topic, score };
    }
  }

  // If we have a clear winner (score >= 5), use it
  // Prefer specific topics over generic 'help' when scores are equal
  const sorted = Object.values(scores).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-breaking: prefer non-help topics (more specific)
    if (a.topic.id === 'help' && b.topic.id !== 'help') return 1;
    if (b.topic.id === 'help' && a.topic.id !== 'help') return -1;
    return 0;
  });
  if (sorted.length > 0 && sorted[0].score >= 5) {
    return sorted[0].topic.respond(message, entities);
  }

  // 6. Multi-topic: if several topics score similarly, combine useful info
  if (sorted.length >= 2 && sorted[0].score >= 3 && sorted[1].score >= 3) {
    const top = sorted[0];
    const second = sorted[1];

    // Combine best topics for common combos
    if ((top.topic.id === 'pricing' && second.topic.id === 'inventory') ||
        (top.topic.id === 'inventory' && second.topic.id === 'pricing')) {
      return `💰📦 **Pricing + Inventory Strategy:**

**Optimal pricing based on stock level:**
• **High stock (>100 units)** → lower price 5-10% to move inventory faster
• **Low stock (<20 units)** → you can raise price 5-8%; demand exceeds supply
• **Optimal price range:** Cost × 1.15 (min) to Competitor-High × 1.20 (max)

**Stock management with pricing:**
• Set **reorder points** = (Daily Sales × Lead Time) + Safety Stock
• Use **Demand Forecast** to predict needs, then price accordingly
• Slow-moving + high stock → bundle with best-sellers or discount
• Fast-moving + low stock → raise price & reorder immediately

**Pro tip:** The **Smart Pricing** page does all this analysis for you automatically!`;
    }

    if ((top.topic.id === 'customers' && second.topic.id === 'revenue') ||
        (top.topic.id === 'revenue' && second.topic.id === 'customers')) {
      return `👥📊 **Customers + Revenue Growth:**

**Segment-based revenue strategies:**
• 👑 **VIP customers** (top 20%) generate ~50-80% of revenue — Nurture them!
  - Priority shipping, exclusive offers, early access
  - They automatically get 15% discount + free shipping
  - Send personal thank-you notes after big orders

• ✅ **Regular customers** — keep them engaged:
  - Send reorder reminders (use Re-order AI predictions!)
  - Offer "buy 3, get 1 free" style incentives
  - Reward early with loyalty points

• 🔄 **Occasional customers** — convert them to Regular:
  - Send "we miss you" offers after 30 days of inactivity
  - Targeted coupons for their favorite categories
  - Remind them of new arrivals in their preferences

• 🆕 **New customers** — turn them into repeat buyers:
  - Great onboarding experience
  - Post-purchase follow-up within 48 hours
  - Recommend complementary products

**Key metric:** Focus on increasing **repeat purchase rate** — it's the fastest path to revenue growth!`;
    }

    if ((top.topic.id === 'forecast' && second.topic.id === 'inventory') ||
        (top.topic.id === 'inventory' && second.topic.id === 'forecast')) {
      return `📈📦 **Forecast + Inventory Optimization:**

**Smart inventory planning using forecasts:**

• **Reorder point** = (Predicted Daily Demand × Lead Time) + Safety Stock
• **Safety stock** = 20-30% above forecast for volatile products
• **Recommended order qty** = (Forecast Total − Current Stock) rounded up

**Action plan by trend:**
• 📈 **Increasing demand** → stock up 15% above forecast total
• 📉 **Decreasing demand** → reduce order qty by 10-15%
• ➡️ **Stable demand** → maintain + 1 week buffer

**Cost-saving tips:**
• Forecast on **30-90 day windows** to get bulk supplier pricing
• Combine with **Expiry Tracker** — don't over-order perishables
• Track **supplier lead times** accurately — under-estimating causes stockouts

**Use the **Demand Forecast** page for each product to see exact numbers!**`;
    }

    if ((top.topic.id === 'orders' && second.topic.id === 'customers') ||
        (top.topic.id === 'customers' && second.topic.id === 'orders')) {
      return `📋👥 **Orders + Customer Experience:**

**Great order management = happy customers = more sales:**

• **Process orders within 24 hours** — speed matters!
• **Proactive updates** — notify customers at each stage (processing → shipped → delivered)
• **Track delivery performance** — late deliveries lose repeat customers
• **Easy returns** — process within 48 hours to build trust

**VIP customer order experience:**
• VIPs get **priority processing** and **free express shipping**
• Consider dedicated courier slots for VIP addresses
• Send delivery confirmation with photo proof

**Reducing order issues:**
• **Double-check addresses** before dispatch
• **Call for COD** orders before delivery to confirm availability
• **Keep items in stock** — backorders upset customers
• **Ship immediately** — order-to-ship time under 12 hours wins loyalty

**Follow-up sequence after delivery:**
1. Delivery confirmation (day 0)
2. Thank-you + feedback request (day 2)
3. Reorder reminder (before predicted next purchase — use Re-order AI!)`;
    }
  }

  // 7. If we have a weak match (score 1-4), still provide relevant response
  if (sorted.length > 0 && sorted[0].score >= 3) {
    return sorted[0].topic.respond(message, entities);
  }

  // 8. Product name detected but no topic — give product-AI response
  if (entities.productName) {
    return `🔍 **About "${entities.productName}":**

**Here's how AI Commerce can help you with this product:**

1. **Write a description** — Go to **Product AI** → **Demo Description** → type "${entities.productName}" → click **Smart Fill** → **Generate Description**. You'll get a short description, 3-paragraph long description, 5 bullet points, and SEO tags.

2. **Set the right price** — Go to **Smart Pricing**, enter the product name, cost, and stock, and AI will recommend an optimal price range.

3. **Forecast demand** — Go to **Demand Forecast**, select the product, and see predicted sales for the next 30-90 days.

4. **Stock it properly** — Set a reorder point on the product page so the system alerts you before it runs out.

Would you like me to walk you through any of these features in more detail?`;
  }

  // 9. Fallback default
  return defaultResponse(message);
}

module.exports = { buildLocalChatReply };