// القوائم اللي يستخدمها الفاحص. كلها مكتوبة هنا داخل المشروع، والصفحة ما تحمّل شي من برّا

// أشهر كلمات المرور في التسريبات العامة، مرتبة تقريباً من الأشهر للأقل.
// الترتيب مهم: كل ما كانت أشهر، كل ما جرّبها المخترق أبكر.
export const COMMON_PASSWORDS = [
  '123456', 'password', '123456789', '12345678', '12345', 'qwerty', '1234567', '111111',
  '1234567890', '123123', 'abc123', '1234', 'password1', 'iloveyou', '1q2w3e4r', '000000',
  'qwerty123', 'zaq12wsx', 'dragon', 'sunshine', 'princess', 'letmein', '654321', 'monkey',
  '1qaz2wsx', '123321', 'qwertyuiop', 'superman', 'asdfghjkl', 'aa123456', 'admin', '666666',
  '121212', 'football', 'baseball', 'welcome', '1q2w3e', '123qwe', 'qwe123', '7777777',
  '888888', '112233', '987654321', '123abc', 'master', 'shadow', 'michael', 'jennifer',
  'hello', 'freedom', 'whatever', 'trustno1', 'starwars', 'passw0rd', 'p@ssw0rd', 'password123',
  'admin123', 'login', 'root', 'test', 'test123', 'guest', 'qwerty1', '123456a',
  'a123456', '1234qwer', 'q1w2e3r4', '1qazxsw2', 'asdf1234', 'asdfgh', 'zxcvbnm', 'zxcvbn',
  '11111111', '00000000', '12341234', '147258369', '159753', '159357', '789456123', '123654',
  '555555', '999999', '222222', '333333', '444444', '101010', '010203', '102030',
  '147258', '963852741', '741852963', '123456789a', 'abcd1234', 'abcdef', 'abcabc', 'iloveyou1',
  'loveyou', 'lovely', 'love', 'secret', 'charlie', 'batman', 'pokemon', 'minecraft',
  'liverpool', 'chelsea', 'arsenal', 'barcelona', 'realmadrid', 'ronaldo', 'messi', 'cristiano',
  'naruto', 'hunter', 'ranger', 'buster', 'soccer', 'hockey', 'killer', 'jordan23',
  'pepper', 'cheese', 'cookie', 'summer', 'flower', 'purple', 'orange', 'banana',
  'computer', 'internet', 'samsung', 'iphone', 'apple', 'google', 'facebook', 'instagram',
  'qazwsx', '1q2w3e4r5t', '1q2w3e4r5t6y', 'zaq1zaq1', '1qaz!qaz', 'changeme', 'default', 'administrator',
  '12qwaszx', 'q1w2e3', 'qweasd', 'qweasdzxc', 'asd123', '123asd', 'mypassword', 'pass',
  'pass123', 'passwd', '1234abcd', '0123456789', '1234512345', '147852', '1478963', '2580',
  'bismillah', 'alhamdulillah', 'mashallah', 'inshallah', 'subhanallah', 'allah', 'saudi', 'ksa',
  'alhilal', 'hilal', 'alnassr', 'nassr', 'ittihad', 'alahli',
];

// قائمة كلمات إنجليزية بسيطة لتوليد عبارات المرور (كل كلمة من 4 إلى 7 حروف).
// نفس القائمة يستخدمها الفاحص كقاموس، لأن المخترق الذكي يفترض إنك تستخدم قائمة معروفة.
export const WORDS = [
  // حيوانات
  'bear', 'bird', 'camel', 'deer', 'duck', 'eagle', 'falcon', 'fish', 'frog', 'goat',
  'horse', 'koala', 'lion', 'llama', 'moose', 'mouse', 'otter', 'panda', 'parrot', 'pigeon',
  'rabbit', 'shark', 'sheep', 'snail', 'tiger', 'turtle', 'whale', 'wolf', 'zebra', 'dolphin',
  'donkey', 'gazelle', 'hawk', 'lizard', 'beetle', 'spider', 'oyster', 'salmon', 'walrus', 'badger',
  // طبيعة
  'river', 'stone', 'ocean', 'cloud', 'storm', 'rain', 'snow', 'wind', 'desert', 'forest',
  'island', 'valley', 'canyon', 'meadow', 'garden', 'beach', 'coral', 'pebble', 'sand', 'dune',
  'oasis', 'lake', 'pond', 'hill', 'cliff', 'cave', 'field', 'flame', 'frost', 'glacier',
  'thunder', 'breeze', 'sunset', 'sunrise', 'moon', 'star', 'planet', 'comet', 'galaxy', 'meteor',
  // أكل
  'mango', 'lemon', 'grape', 'peach', 'melon', 'cherry', 'olive', 'carrot', 'potato', 'tomato',
  'onion', 'honey', 'bread', 'butter', 'rice', 'salad', 'soup', 'pizza', 'pasta', 'noodle',
  'waffle', 'pancake', 'yogurt', 'coffee', 'juice', 'milk', 'sugar', 'salt', 'almond', 'walnut',
  'peanut', 'coconut', 'kiwi', 'plum', 'berry', 'bagel', 'donut', 'muffin', 'toast', 'cereal',
  // أشياء
  'table', 'chair', 'lamp', 'clock', 'candle', 'mirror', 'pillow', 'blanket', 'basket', 'bottle',
  'bucket', 'button', 'camera', 'compass', 'crayon', 'globe', 'hammer', 'helmet', 'kettle', 'ladder',
  'lantern', 'magnet', 'marble', 'needle', 'pencil', 'pocket', 'puzzle', 'ribbon', 'rocket', 'saddle',
  'shovel', 'spoon', 'fork', 'plate', 'teapot', 'ticket', 'tissue', 'trophy', 'wallet', 'wagon',
  'whistle', 'window', 'door', 'roof', 'bridge', 'tower', 'castle', 'tent', 'boat', 'train',
  'truck', 'bicycle', 'scooter', 'engine', 'anchor', 'paddle', 'balloon', 'kite', 'drum', 'flute',
  'guitar', 'piano', 'violin', 'bell', 'harp', 'brush', 'carpet', 'curtain', 'drawer', 'feather',
  // ألوان وصفات
  'amber', 'azure', 'golden', 'silver', 'bronze', 'ivory', 'violet', 'crimson', 'indigo', 'maroon',
  'beige', 'cyan', 'brave', 'calm', 'clever', 'cozy', 'eager', 'fancy', 'gentle', 'happy',
  'jolly', 'kind', 'lively', 'lucky', 'merry', 'polite', 'proud', 'quick', 'quiet', 'rapid',
  'shiny', 'silly', 'smart', 'sunny', 'swift', 'tidy', 'witty', 'zesty', 'bold', 'bright',
  'fresh', 'grand', 'humble', 'noble', 'plain', 'royal', 'simple', 'solid', 'steady', 'sweet',
  'tiny', 'vivid', 'warm', 'wild', 'young', 'fuzzy', 'giant', 'hollow', 'little', 'mighty',
  // أفعال
  'jump', 'climb', 'dance', 'dream', 'float', 'glide', 'laugh', 'paint', 'plant', 'read',
  'write', 'smile', 'sing', 'swim', 'think', 'travel', 'wander', 'whisper', 'build', 'carry',
  'catch', 'cook', 'draw', 'explore', 'gather', 'juggle', 'march', 'shine', 'skip', 'spin',
  'stack', 'sweep', 'throw', 'listen', 'borrow', 'follow', 'collect', 'invent', 'repair', 'search',
  // أماكن وتقنية
  'city', 'village', 'market', 'harbor', 'school', 'library', 'museum', 'palace', 'studio', 'office',
  'kitchen', 'attic', 'cellar', 'garage', 'porch', 'yard', 'street', 'avenue', 'station', 'airport',
  'north', 'south', 'east', 'west', 'corner', 'circle', 'square', 'arrow', 'echo', 'riddle',
  'story', 'poem', 'song', 'music', 'rhythm', 'melody', 'chorus', 'signal', 'pixel', 'laser',
  'robot', 'orbit', 'radar', 'sonar', 'vector', 'matrix', 'cipher', 'token', 'binary', 'kernel',
  'router', 'tennis', 'rugby', 'chess', 'cricket', 'karate', 'bowling', 'sprint', 'relay', 'archer',
];

// أسماء شائعة بالحروف الإنجليزية. قوائم المخترقين فيها آلاف الأسماء، هذي عينة صغيرة بس
export const NAMES = [
  'ahmed', 'ahmad', 'mohammed', 'mohamed', 'muhammad', 'mohammad', 'mohamad', 'ali', 'omar', 'umar',
  'abdullah', 'abdulaziz', 'abdulrahman', 'khalid', 'khaled', 'fahad', 'fahd', 'faisal', 'saud', 'sultan',
  'salman', 'turki', 'nasser', 'saad', 'majed', 'majid', 'hassan', 'hasan', 'hussain', 'hussein',
  'hamza', 'yousef', 'yusuf', 'ibrahim', 'ismail', 'ziyad', 'ziad', 'rayan', 'bandar', 'nawaf',
  'meshal', 'mishal', 'tariq', 'sami', 'hamad', 'mansour', 'waleed', 'walid', 'yasser', 'yazeed',
  'yazid', 'osama', 'adel', 'abdulmajeed', 'fatima', 'fatimah', 'noura', 'nora', 'nourah', 'sara',
  'sarah', 'maryam', 'mariam', 'aisha', 'reem', 'rahaf', 'lama', 'dana', 'hessa', 'hind',
  'haya', 'amal', 'nouf', 'shahad', 'joud', 'jana', 'layan', 'lujain', 'ghada', 'huda',
  'asma', 'john', 'david', 'james', 'robert', 'daniel', 'jessica', 'ashley', 'nicole', 'michelle',
];

// كلمات وأسماء عربية شائعة. نكتبها بدون همزات على الألف وبالهاء بدل التاء المربوطة،
// والفاحص يوحّد كتابة كلمة المرور بنفس الطريقة قبل ما يقارن.
export const ARABIC_WORDS = [
  'السلام', 'الله', 'محمد', 'احمد', 'عبدالله', 'السعوديه', 'الرياض', 'جده', 'مكه', 'المدينه',
  'الدمام', 'حبيبي', 'حبيبتي', 'نوره', 'فهد', 'خالد', 'سلطان', 'فيصل', 'سعود', 'ناصر',
  'سعد', 'عمر', 'علي', 'حسن', 'حسين', 'فاطمه', 'ساره', 'مريم', 'عايشه', 'ريم',
  'نوف', 'لمى', 'الهلال', 'النصر', 'الاتحاد', 'الاهلي', 'بسمالله', 'الحمدلله', 'ماشاءالله', 'انشاءالله',
  'سبحانالله', 'استغفرالله', 'حياتي', 'قلبي', 'عمري', 'روحي', 'امي', 'ابوي', 'بابا', 'ماما',
  'اهلا', 'مرحبا', 'شكرا', 'المملكه', 'وطني', 'كلمهالسر', 'كلمهمرور', 'رمضان', 'ابراهيم', 'يوسف',
  'عبدالرحمن', 'عبدالعزيز', 'تركي', 'بندر', 'نواف', 'ماجد', 'الحب', 'مكتب', 'مدرسه', 'سلمان',
];
