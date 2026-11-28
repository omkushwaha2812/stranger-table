// Catalogue data ported from the former supabase/migrations/004_seed.sql.
export const seedInterests: string[] = ["Music", "Movies and series", "Travel", "Technology", "Coding", "Startups", "Photography", "Gaming", "Finance", "Books", "Art and design", "Sports", "Food", "Fashion", "Philosophy", "Entrepreneurship"];
export const seedPreferences: string[] = ["Casual conversations", "Meaningful conversations", "Professional networking", "Creative collaborations", "Making new friends", "Random conversations"];
export const seedCategories = [
 {
  "slug": "chai",
  "name": "The Chai Table",
  "description": "A casual conversation over chai or coffee.",
  "icon": "coffee",
  "duration": 30,
  "is_group": false
 },
 {
  "slug": "founder",
  "name": "The Founder Table",
  "description": "Explore startups and business ideas.",
  "icon": "rocket",
  "duration": 45,
  "is_group": false
 },
 {
  "slug": "deep",
  "name": "The Deep Talk Table",
  "description": "Talk about ambitions and experiences.",
  "icon": "messages-square",
  "duration": 45,
  "is_group": false
 },
 {
  "slug": "fun",
  "name": "The Fun Table",
  "description": "Games and lighthearted conversations.",
  "icon": "gamepad-2",
  "duration": 30,
  "is_group": false
 },
 {
  "slug": "walk",
  "name": "The Walk Table",
  "description": "Share a story about a place you love.",
  "icon": "footprints",
  "duration": 30,
  "is_group": false
 },
 {
  "slug": "mystery",
  "name": "The Mystery Table",
  "description": "Discover someone new through a random match.",
  "icon": "sparkles",
  "duration": 30,
  "is_group": false
 },
 {
  "slug": "group",
  "name": "The Group Table",
  "description": "People from different backgrounds.",
  "icon": "users",
  "duration": 60,
  "is_group": true
 }
];
export const seedCards: [category: string, question: string][] = [
 [
  "Fun",
  "What snack deserves its own national holiday?"
 ],
 [
  "Fun",
  "Which fictional gadget would you borrow?"
 ],
 [
  "Fun",
  "What harmless rule would you invent for a day?"
 ],
 [
  "Fun",
  "What is your oddly specific talent?"
 ],
 [
  "Fun",
  "Which song would play during your entrance?"
 ],
 [
  "Fun",
  "What tiny inconvenience makes you laugh?"
 ],
 [
  "Fun",
  "What game would you win without practice?"
 ],
 [
  "Fun",
  "What would your imaginary cafe serve?"
 ],
 [
  "Fun",
  "Which ordinary object deserves a dramatic movie trailer?"
 ],
 [
  "Deep conversations",
  "What belief have you changed your mind about?"
 ],
 [
  "Deep conversations",
  "When do you feel most like yourself?"
 ],
 [
  "Deep conversations",
  "What makes a conversation memorable?"
 ],
 [
  "Deep conversations",
  "What does a meaningful friendship look like?"
 ],
 [
  "Deep conversations",
  "What quiet achievement matters to you?"
 ],
 [
  "Deep conversations",
  "What would you tell your younger self?"
 ],
 [
  "Deep conversations",
  "What does enough mean to you?"
 ],
 [
  "Deep conversations",
  "What kind of courage do you admire?"
 ],
 [
  "Deep conversations",
  "What do you hope never changes about you?"
 ],
 [
  "College life",
  "What campus corner feels underrated?"
 ],
 [
  "College life",
  "What class surprised you most?"
 ],
 [
  "College life",
  "What would you change about orientation?"
 ],
 [
  "College life",
  "What is your favourite college tradition?"
 ],
 [
  "College life",
  "What would you try before graduation?"
 ],
 [
  "College life",
  "What is your ideal study break?"
 ],
 [
  "College life",
  "What skill should every student learn?"
 ],
 [
  "College life",
  "What campus event would you invent?"
 ],
 [
  "College life",
  "What is the nicest small gesture you have seen on campus?"
 ],
 [
  "Career",
  "What problem would you enjoy solving?"
 ],
 [
  "Career",
  "What job would you shadow for a day?"
 ],
 [
  "Career",
  "What skill would you learn without grades?"
 ],
 [
  "Career",
  "What business would you start with a friend?"
 ],
 [
  "Career",
  "What makes a team enjoyable to work with?"
 ],
 [
  "Career",
  "What project would you build for your community?"
 ],
 [
  "Career",
  "What career advice has helped you?"
 ],
 [
  "Career",
  "What would your ideal workday look like?"
 ],
 [
  "Career",
  "What field outside your degree interests you?"
 ],
 [
  "Random",
  "What object tells a story about your life?"
 ],
 [
  "Random",
  "What invention feels like magic to you?"
 ],
 [
  "Random",
  "What topic could you explain for an hour?"
 ],
 [
  "Random",
  "What would you put in a time capsule?"
 ],
 [
  "Random",
  "What three things make a perfect Sunday?"
 ],
 [
  "Random",
  "What fictional world would you visit briefly?"
 ],
 [
  "Random",
  "What is a small mystery you want solved?"
 ],
 [
  "Random",
  "What would you name a tiny bookstore?"
 ],
 [
  "Random",
  "What unusual hobby would you try?"
 ],
 [
  "Travel",
  "What place would you revisit just for the food?"
 ],
 [
  "Travel",
  "What would your ideal train journey look like?"
 ],
 [
  "Travel",
  "What landscape makes you feel calm?"
 ],
 [
  "Travel",
  "What local tradition would you like to learn?"
 ],
 [
  "Travel",
  "What would you pack for a spontaneous weekend?"
 ],
 [
  "Travel",
  "What is a memorable journey close to home?"
 ],
 [
  "Travel",
  "What city would you explore on foot?"
 ],
 [
  "Travel",
  "What travel skill would you like to master?"
 ],
 [
  "Travel",
  "What destination surprised you in a story or film?"
 ],
 [
  "Personal growth",
  "What habit has made your days better?"
 ],
 [
  "Personal growth",
  "What does progress look like this month?"
 ],
 [
  "Personal growth",
  "What small skill are you proud of learning?"
 ],
 [
  "Personal growth",
  "What helps you recover from a difficult day?"
 ],
 [
  "Personal growth",
  "What would you attempt if failure were harmless?"
 ],
 [
  "Personal growth",
  "What is a boundary you appreciate in friendships?"
 ],
 [
  "Personal growth",
  "What does a balanced week look like?"
 ],
 [
  "Personal growth",
  "What activity helps you stay curious?"
 ],
 [
  "Personal growth",
  "What would you like to make more time for?"
 ]
];
export const seedAchievements = [
 {
  "slug": "first-hello",
  "name": "First Hello",
  "description": "Connect at one table"
 },
 {
  "slug": "social-butterfly",
  "name": "Social Butterfly",
  "description": "Connect at five tables"
 },
 {
  "slug": "beyond-borders",
  "name": "Beyond Borders",
  "description": "Connect across three cities"
 },
 {
  "slug": "chai-enthusiast",
  "name": "Chai Enthusiast",
  "description": "Complete five Chai Tables"
 },
 {
  "slug": "explorer",
  "name": "The Explorer",
  "description": "Complete all six original one-to-one categories"
 },
 {
  "slug": "campus-connector",
  "name": "Community Connector",
  "description": "Connect at twenty tables"
 }
];
