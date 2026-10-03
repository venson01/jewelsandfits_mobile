// Response shapes of the website's mobile API (/api/mobile/v1). Mirrors
// src/server/mobile/serialize.ts in the website repo. Money is integer kobo (NGN);
// dates arrive as ISO strings.

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  imageAlt: string;
  hoverImage: string | null;
  ratingAvg: number;
  ratingCount: number;
  isNew: boolean;
  isBestseller: boolean;
  inStock: boolean;
  /** Set when the product has exactly one variant, so it can be added from a card. */
  quickAdd: { variantId: string; stock: number; title: string } | null;
};

export type Category = { id: string; name: string; slug: string; image: string | null };

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heroImage: string | null;
  isFeatured: boolean;
};

export type Look = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image: string | null;
  products: ProductCard[];
};

export type FeaturedReview = {
  id: string;
  rating: number;
  body: string;
  authorName: string;
  productName: string;
  productSlug: string;
};

export type HomeData = {
  announcement: string;
  categories: Category[];
  collections: Collection[];
  bestsellers: ProductCard[];
  newArrivals: ProductCard[];
  looks: Look[];
  reviews: FeaturedReview[];
};

export type Variant = {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isDefault: boolean;
};

export type ProductReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  createdAt: string;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: { name: string; slug: string } | null;
  material: string | null;
  purity: string | null;
  weightGrams: number | null;
  gemstones: string | null;
  careInfo: string | null;
  certification: string | null;
  tags: string[];
  isNew: boolean;
  isBestseller: boolean;
  ratingAvg: number;
  ratingCount: number;
  images: { url: string; alt: string }[];
  variants: Variant[];
  reviews: ProductReview[];
};

export type ProductResponse = { product: ProductDetail; related: ProductCard[] };

export type ProductSort = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';

export type ProductQuery = {
  category?: string;
  collection?: string;
  q?: string;
  bestsellers?: boolean;
  new?: boolean;
  inStock?: boolean;
  sort?: ProductSort;
};

export type ProductPage = { items: ProductCard[]; total: number; offset: number; limit: number };

export type QuoteLine = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantTitle: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

export type Quote = {
  lines: QuoteLine[];
  totals: { subtotal: number; discount: number; shippingFee: number; giftWrapFee: number; tax: number; total: number };
  currency: string;
  zone: { id: string; name: string; etaText: string; fee: number; freeOver: number | null } | null;
  coupon: { code: string; applied: boolean; message: string } | null;
  problems: string[];
};

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  role: 'customer' | 'admin';
};

export type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
};

/** A saved-cart line with current price and stock (GET/PUT /cart, POST /cart/merge). */
export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantTitle: string;
  image: string | null;
  unitPrice: number;
  stock: number;
  quantity: number;
};

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'payment_failed';

export type OrderSummary = {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  itemCount: number;
  placedAt: string;
};

export type OrderDetail = {
  orderNumber: string;
  status: OrderStatus;
  canRetryPayment: boolean;
  email: string;
  phone: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  giftWrapFee: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode?: string | null;
    country: string;
  };
  shippingZoneName: string | null;
  couponCode: string | null;
  giftWrap: boolean;
  giftMessage: string | null;
  paymentMethod: 'online' | 'pay_on_delivery';
  paymentChannel: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  placedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: {
    productId: string | null;
    productSlug: string;
    productName: string;
    variantTitle: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    imageUrl: string | null;
  }[];
  timeline: { status: OrderStatus; at: string }[];
};

/** Body of POST /checkout: the website's checkoutSchema. */
export type CheckoutInput = {
  email: string;
  phone: string;
  address: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode?: string;
  };
  saveAddress: boolean;
  shippingZoneId: string;
  giftWrap: boolean;
  giftMessage?: string;
  couponCode?: string;
  paymentMethod: 'online' | 'pay_on_delivery';
  items: { variantId: string; quantity: number }[];
};

/** checkoutUrl is null for Pay on Delivery (the order is already placed). */
export type PlacedOrder = { orderNumber: string; checkoutUrl: string | null; paymentMethod: 'online' | 'pay_on_delivery' };

export type StoreConfig = {
  currency: string;
  announcement: string;
  paymentProvider: 'paystack' | 'flutterwave';
  payOnDelivery: boolean;
  giftWrapFee: number;
  whatsappNumber: string | null;
  supportPhone: string | null;
  states: string[];
  shippingZones: { id: string; name: string; states: string[]; fee: number; freeOver: number | null; etaText: string }[];
  materials: string[];
};
