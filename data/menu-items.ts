export const menuCategories = ['Beverages', 'Mains', 'Sides', 'Desserts'] as const;
export type MenuCategory = (typeof menuCategories)[number];

export interface MenuItemData {
  code: string;
  name: string;
  category: MenuCategory;
  basePrice: number;
  description: string;
  variations?: string[];
  addOns?: string[];
}

export const menuItems: MenuItemData[] = [
  {
    code: 'BEV-ESP',
    name: 'Espresso',
    category: 'Beverages',
    basePrice: 120,
    description: 'Rich espresso shot pulled with a thick crema.',
  },
  {
    code: 'BEV-CAP',
    name: 'Cappucino',
    category: 'Beverages',
    basePrice: 155,
    description: 'Steamed milk and espresso layered with velvet foam.',
    variations: ['Hazelnut syrup', 'Orange syrup', 'Vanilla syrup'],
  },
  {
    code: 'BEV-MOC',
    name: 'Mocha',
    category: 'Beverages',
    basePrice: 165,
    description: 'Chocolate-stitched espresso with frothed milk.',
  },
  {
    code: 'BEV-LAT',
    name: 'Latte',
    category: 'Beverages',
    basePrice: 150,
    description: 'Silky latte served with crema and optional syrups.',
    variations: ['Hazelnut syrup', 'Orange syrup', 'Vanilla syrup'],
  },
  {
    code: 'BEV-TON',
    name: 'Tonic + espresso drinks',
    category: 'Beverages',
    basePrice: 180,
    description: 'Sparkling tonic fused with espresso and citrus boosters.',
    variations: ['Orange syrup', 'Vanilla syrup', 'Cranberry syrup', 'Coke'],
  },
  {
    code: 'BEV-LIT',
    name: 'Lemon Iced tea',
    category: 'Beverages',
    basePrice: 130,
    description: 'Bright lemon iced tea brewed fresh and chilled.',
  },
  {
    code: 'BEV-PIT',
    name: 'Peach Iced tea',
    category: 'Beverages',
    basePrice: 140,
    description: 'Sweet peach iced tea poured over ice.',
  },
  {
    code: 'BEV-MAT',
    name: 'Matcha latte',
    category: 'Beverages',
    basePrice: 195,
    description: 'Creamy matcha latte made with ceremonial-grade matcha.',
  },
  {
    code: 'BEV-IMT',
    name: 'Iced Matcha latte',
    category: 'Beverages',
    basePrice: 215,
    description: 'Chilled matcha latte with seasonal fruit syrups.',
    variations: ['Strawberry', 'Peach', 'Mango (seasonal) syrup'],
  },
  {
    code: 'BEV-HCO',
    name: 'Hot cocoa',
    category: 'Beverages',
    basePrice: 150,
    description: 'Velvety hot chocolate dusted with cocoa.',
  },
  {
    code: 'MAINS-ALF',
    name: 'Alfredo Pasta',
    category: 'Mains',
    basePrice: 380,
    description: 'Fettuccine tossed in a silky Alfredo cream sauce.',
    addOns: ['Chicken'],
  },
  {
    code: 'MAINS-ARR',
    name: 'Arrabiata Pasta',
    category: 'Mains',
    basePrice: 360,
    description: 'Penne in a fiery tomato arrabiata sauce.',
    addOns: ['Chicken'],
  },
  {
    code: 'MAINS-VBG',
    name: 'Veg Burger',
    category: 'Mains',
    basePrice: 220,
    description: 'House-made veg patty with greens and pickles.',
  },
  {
    code: 'MAINS-FCB',
    name: 'Fried chicken Burger',
    category: 'Mains',
    basePrice: 280,
    description: 'Crispy fried chicken in a pillowy bun.',
  },
  {
    code: 'MAINS-BBQ',
    name: 'BBQ chicken Burger',
    category: 'Mains',
    basePrice: 260,
    description: 'Smoky BBQ chicken patty with slaw and sauce.',
  },
  {
    code: 'SIDES-SLF',
    name: 'Salted Fries',
    category: 'Sides',
    basePrice: 140,
    description: 'Hand-cut fries tossed with sea salt.',
  },
  {
    code: 'SIDES-PPF',
    name: 'Peri peri Fries',
    category: 'Sides',
    basePrice: 150,
    description: 'Peri peri seasoned fries with chilli notes.',
  },
  {
    code: 'SIDES-PAF',
    name: 'parmesan Fries',
    category: 'Sides',
    basePrice: 160,
    description: 'Parmesan-dusted fries finished with herbs.',
  },
  {
    code: 'SIDES-LDF',
    name: 'Loaded Fries',
    category: 'Sides',
    basePrice: 260,
    description: 'Cheesy loaded fries with jalapeños and chilies.',
    addOns: ['Chicken'],
  },
  {
    code: 'MAINS-GCS',
    name: 'Grilled cheese Sandwich',
    category: 'Mains',
    basePrice: 190,
    description: 'Griddled sourdough with melted cheddar.',
  },
  {
    code: 'MAINS-BBS',
    name: 'BBQ chicken Sandwich',
    category: 'Mains',
    basePrice: 240,
    description: 'BBQ chicken, slaw, and pickles on toasted bread.',
  },
  {
    code: 'SIDES-ONR',
    name: 'onion rings',
    category: 'Sides',
    basePrice: 140,
    description: 'Crispy beer-battered onion rings.',
  },
  {
    code: 'SIDES-CTN',
    name: 'chicken tenders',
    category: 'Sides',
    basePrice: 260,
    description: 'Seasoned chicken tenders served with house dip.',
  },
  {
    code: 'DSRT-CHC',
    name: 'Chocochunk Cookie',
    category: 'Desserts',
    basePrice: 90,
    description: 'Double chocolate cookie with warm chunks.',
    addOns: ['Vanilla Ice Cream'],
  },
  {
    code: 'DSRT-BWC',
    name: 'Blueberry white chocolate Cookie',
    category: 'Desserts',
    basePrice: 100,
    description: 'Blueberry and white chocolate chip cookie.',
    addOns: ['Vanilla Ice Cream'],
  },
  {
    code: 'DSRT-SMC',
    name: "S'mores Cookie",
    category: 'Desserts',
    basePrice: 95,
    description: 'Toasty cookie with marshmallow and chocolate.',
    addOns: ['Vanilla Ice Cream'],
  },
  {
    code: 'DSRT-RVC',
    name: 'Red Velvet Cookie',
    category: 'Desserts',
    basePrice: 110,
    description: 'Red velvet cookie topped with cream cheese dust.',
    addOns: ['Vanilla Ice Cream'],
  },
  {
    code: 'DSRT-DCC',
    name: 'Double Chocolate Cookie',
    category: 'Desserts',
    basePrice: 100,
    description: 'Double chocolate chip cookie that stays molten.',
    addOns: ['Vanilla Ice Cream'],
  },
  {
    code: 'DSRT-NTC',
    name: 'Nutella Cookie',
    category: 'Desserts',
    basePrice: 120,
    description: 'Nutella-stuffed cookie with a caramelized crust.',
    addOns: ['Vanilla Ice Cream'],
  },
  {
    code: 'DSRT-PBC',
    name: 'Peanut Butter Cookie',
    category: 'Desserts',
    basePrice: 110,
    description: 'Crunchy peanut butter cookie with salt.',
    addOns: ['Vanilla Ice Cream'],
  },
];

export const groupedMenuItems = menuCategories.map((category) => ({
  category,
  items: menuItems.filter((item) => item.category === category),
}));
