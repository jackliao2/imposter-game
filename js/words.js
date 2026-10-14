(function (g, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  g.WORD_PACK = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return {
    categories: {
      food: [
        "apple","banana","pizza","bread","cheese","cookie","soup","salad","rice","pasta",
        "egg","milk","butter","honey","lemon","orange","grape","mango","peach","strawberry",
        "chocolate","coffee","tea","sandwich","burger","taco","noodle","pancake","waffle","yogurt",
        "popcorn","pretzel","donut","muffin","bacon","steak","carrot","potato","tomato","onion",
        "garlic","corn","peanut","coconut","sushi","curry","pie","olive","pickle","cereal",
        "avocado","blueberry","cherry","watermelon","pumpkin","bagel","croissant","oatmeal","chili","lasagna",
        "dumpling","hummus","brownie","caramel","vanilla","cinnamon","pepper","salt","sugar","vinegar",
        "meatball","sausage","shrimp","salmon","omelet","guacamole","salsa","ramen","burrito","kebab",
        "pita","espresso","smoothie","lemonade","stew","kebab wrap","fried rice","peanut butter","jam","nachos",
        "biscuit","pudding","marshmallow","gravy","ravioli","gnocchi","tortilla","latte","hot chocolate","popsicle"
      ],
      animals: [
        "dog","cat","horse","lion","tiger","bear","wolf","fox","rabbit","deer",
        "mouse","elephant","giraffe","zebra","monkey","panda","koala","kangaroo","whale","dolphin",
        "shark","goldfish","frog","snake","turtle","eagle","owl","duck","penguin","parrot",
        "bee","ant","spider","butterfly","crab","octopus","cow","pig","sheep","goat",
        "camel","squirrel","bat","swan","flamingo","hedgehog","raccoon","skunk","otter","beaver",
        "moose","rhino","hippo","crocodile","lizard","gecko","jellyfish","starfish","seahorse","lobster",
        "snail","beetle","ladybug","dragonfly","hamster","guinea pig","ferret","robin","crow","pigeon",
        "seagull","peacock","goose","donkey","pony","trout","walrus","seal","polar bear","grizzly",
        "lemur","gorilla","sloth","armadillo","porcupine","jaguar","cheetah","hyena","meerkat","wombat",
        "platypus","toucan","hummingbird","ostrich","falcon","hawk","puffin","rooster","chick","mule"
      ],
      places: [
        "beach","airport","hospital","library","museum","park","zoo","farm","castle","hotel",
        "restaurant","stadium","bridge","island","mountain","market","station","theater","cinema","bank",
        "cave","volcano","waterfall","harbor","playground","bakery","circus","factory","garage","garden",
        "rooftop","campus","lighthouse","windmill","barn","pier","canyon","valley","orchard","vineyard",
        "aquarium","planetarium","arcade","bookstore","pharmacy","post office","fire station","courthouse","cabin","campsite",
        "trail","ice rink","bowling alley","mall","diner","cafe","laundromat","barber shop","flower shop","hardware store",
        "gallery","concert hall","laboratory","observatory","dock","marina","swimming pool","town square","fountain","clock tower",
        "subway","bus stop","gas station","supermarket","food truck","carnival","ferris wheel","schoolyard","attic","basement",
        "balcony","porch","tunnel","crosswalk","greenhouse","stable","boardwalk","ski lodge","toy store","dentist office"
      ],
      home: [
        "sofa","armchair","stool","lamp","candle","mirror","pillow","blanket","towel","soap",
        "toothbrush","shampoo","fridge","oven","kettle","toaster","sink","shower","bed","wardrobe",
        "curtain","carpet","vase","broom","bucket","hammer","scissors","umbrella","wallet","remote",
        "television","radio","camera","charger","basket","shelf","cushion","rug","mug","fork",
        "spoon","knife","pan","pot","spatula","apron","sponge","vacuum","mop","iron",
        "hanger","drawer","doorbell","mailbox","flashlight","fireplace","fan","picture frame","houseplant","watering can",
        "toolbox","screwdriver","needle","thread","button","envelope","calendar","cookbook","plate","bowl",
        "napkin","colander","whisk","ladle","dish soap","trash can","washing machine","dryer","coat rack","doormat",
        "light switch","smoke alarm","tissue","comb","hairbrush","bandage","thermometer","cutting board","can opener","placemat",
        "tablecloth","candlestick","recipe book","spice jar","bottle opener","rubber band","paper clip","safety pin","step ladder","sewing kit"
      ],
      nature: [
        "sun","moon","star","cloud","rain","snow","wind","storm","rainbow","fog",
        "thunder","leaf","tree","flower","grass","rock","sand","mud","fire","smoke",
        "ice","wave","seed","branch","root","moss","cactus","mushroom","shell","pearl",
        "coral","lightning","hail","frost","dew","puddle","stream","boulder","pebble","cliff",
        "glacier","iceberg","lava","geyser","oasis","dune","swamp","reed","seaweed","driftwood",
        "tide","comet","eclipse","horizon","sunrise","sunset","tornado","hurricane","drizzle","blizzard",
        "icicle","snowflake","pine","oak","maple","willow","palm","bamboo","vine","ivy",
        "fern","clover","dandelion","daisy","rose","tulip","sunflower","lavender","acorn","pinecone",
        "bark","nectar","feather","fossil","crystal","marble","clay","sprout","blossom","petal",
        "thorn","berries","web","beehive","bird nest","pine needle","constellation","whirlpool","avalanche","hot spring"
      ],
      jobs: [
        "doctor","nurse","teacher","chef","farmer","pilot","driver","artist","singer","dancer",
        "actor","writer","baker","fisher","miner","judge","firefighter","scientist","dentist","vet",
        "mechanic","plumber","barber","tailor","sailor","gardener","photographer","journalist","cashier","waiter",
        "builder","carpenter","electrician","librarian","coach","architect","engineer","designer","editor","lawyer",
        "accountant","pharmacist","surgeon","paramedic","principal","professor","tutor","flight attendant","captain","lifeguard",
        "ranger","zookeeper","mailman","courier","receptionist","housekeeper","janitor","detective","astronaut","astronomer",
        "geologist","biologist","chemist","historian","curator","tour guide","newscaster","director","poet","illustrator",
        "animator","programmer","consultant","intern","butcher","florist","jeweler","locksmith","potter","conductor",
        "musician","drummer","pianist","violinist","referee","umpire","midwife","therapist","optometrist","blacksmith"
      ],
      sports: [
        "soccer","basketball","tennis","golf","baseball","swimming","running","cycling","boxing","skiing",
        "surfing","skating","volleyball","hockey","cricket","rugby","bowling","archery","rowing","climbing",
        "yoga","gymnastics","wrestling","fencing","diving","karate","badminton","softball","lacrosse","hiking",
        "jogging","curling","sailing","kayak","skateboard","marathon","frisbee","darts","handball","water polo",
        "high jump","long jump","shot put","discus","javelin","hurdles","relay","triathlon","snowboarding","luge",
        "bobsled","bmx","weightlifting","pilates","jump rope","taekwondo","judo","sumo","dodgeball","kickball",
        "trampoline","handstand","cartwheel","backstroke","freestyle","snorkel","scuba","waterski","wakeboard","canoe",
        "croquet","bocce","horseshoes","billiards","snooker","foosball","air hockey","cornhole","ping pong","polo",
        "figure skating","cross country","downhill","slalom","motocross","horse racing","dressage","arm wrestling","tug of war","capture the flag"
      ],
      school: [
        "pencil","eraser","ruler","notebook","textbook","desk","chalk","marker","crayon","glue",
        "homework","exam","recess","student","locker","calculator","globe","map","lunchbox","diploma",
        "projector","keyboard","paintbrush","clay","stapler","highlighter","flash card","binder","worksheet","quiz",
        "report card","field trip","permission slip","cafeteria","science fair","book report","essay","spelling test","fraction","algebra",
        "biology","chemistry","history class","geography","band","choir","school play","yearbook","graduation","backpack",
        "pencil case","sharpener","bookmark","dictionary","thesaurus","atlas","protractor","graph paper","whiteboard","blackboard",
        "headphones","podium","name tag","attendance","assembly","school bus","crossing guard","whistle","scoreboard","bleachers",
        "pep rally","mascot","homeroom","timetable","study hall","library card","overdue book","chapter","glossary","pop quiz",
        "detention","counselor","nurse office","cubby","gym uniform","combination lock","tassel","cap and gown","diorama","volcano model"
      ],
      clothes: [
        "shirt","pants","dress","skirt","jacket","coat","hat","cap","scarf","gloves",
        "socks","shoes","boots","sneakers","belt","tie","suit","sweater","hoodie","jeans",
        "shorts","pajamas","uniform","helmet","crown","ring","necklace","bracelet","earrings","glasses",
        "sunglasses","watch","purse","sandals","slippers","vest","robe","mittens","earmuffs","beanie",
        "beret","fedora","visor","headband","bow","suspenders","blouse","cardigan","turtleneck","leggings",
        "tights","loafers","heels","flip flops","raincoat","poncho","trench coat","parka","blazer","tuxedo",
        "gown","kimono","overalls","scrubs","lab coat","jersey","wristband","tracksuit","windbreaker","shawl",
        "cape","bow tie","pocket watch","anklet","tote","clutch","satchel","duffel","zipper","collar",
        "denim","leather","silk","wool","cotton","linen","velvet","fleece","cleats","apron"
      ]
    },
    cousins: [
      ["coffee","tea"],["dog","cat"],["sun","moon"],["beach","mountain"],["piano","guitar"],
      ["rain","snow"],["bus","train"],["doctor","nurse"],["pen","pencil"],["river","lake"],
      ["cake","pie"],["king","queen"],["summer","winter"],["fork","spoon"],["movie","book"],
      ["car","bicycle"],["shirt","jacket"],["apple","orange"],["morning","night"],["teacher","student"],
      ["soup","salad"],["lion","tiger"],["soccer","basketball"],["hotel","cabin"],["clock","watch"],
      ["boots","sneakers"],["forest","jungle"],["cheese","butter"],["chair","stool"],["lamp","candle"],
      ["boat","ship"],["horse","donkey"],["bread","toast"],["cloud","fog"],["castle","palace"],
      ["ring","necklace"],["hammer","screwdriver"],["school","library"],["pizza","burger"],["glove","scarf"],
      ["key","lock"],["window","door"],["farmer","chef"],["tennis","golf"],["rose","tulip"],
      ["pillow","blanket"],["soap","shampoo"],["mug","glass"],["eagle","owl"],["shark","dolphin"],
      ["cookie","brownie"],["lemon","lime"],["hat","cap"],["subway","taxi"],["painter","sculptor"],
      ["camping","hiking"],["ocean","pool"],["toaster","kettle"],["bee","butterfly"],["frog","toad"],
      ["panda","koala"],["sushi","ramen"],["taco","burrito"],["hockey","skating"],["skiing","snowboarding"],
      ["pencil","crayon"],["exam","homework"],["jeans","shorts"],["dress","skirt"],["crown","tiara"],
      ["firefighter","pilot"],["island","beach"],["cave","tunnel"],["rainbow","storm"],["cactus","fern"],
      ["wallet","purse"],["remote","television"],["fridge","oven"],["spider","ant"],["whale","seal"],
      ["peach","mango"],["onion","garlic"],["stadium","gym"],["museum","gallery"],["airport","station"],
      ["camera","phone"],["battery","charger"],["broom","mop"],["snow","hail"],["cookie","donut"]
    ]
  };
});
