export interface TnauSeedItem {
  id: string;
  category: 'Fruit Seeds' | 'Vegetable Seeds' | 'Breeder Seeds (Vegetables)' | 'Flower & Tree Seeds' | 'Medicinal Plant Seeds';
  slNo: string | number;
  particulars: string;
  pricePerKg: number;
  unit: string;
  rawPriceText: string;
}

export const TNAU_SEEDS_FALLBACK: TnauSeedItem[] = [
    {
        "id":  "seed-fruit-1",
        "pricePerKg":  5000,
        "rawPriceText":  "5000.00",
        "slNo":  "1",
        "particulars":  "Papaya â€“ Co 7, Co 3",
        "unit":  "kg",
        "category":  "Fruit Seeds"
    },
    {
        "id":  "seed-fruit-2",
        "pricePerKg":  2000,
        "rawPriceText":  "2000.00",
        "slNo":  "2",
        "particulars":  "Papaya â€“ Co 1, Co 2, Co 4, Co 5, Co 6 seeds",
        "unit":  "kg",
        "category":  "Fruit Seeds"
    },
    {
        "id":  "seed-veg-1",
        "pricePerKg":  300,
        "rawPriceText":  "300.00",
        "slNo":  "1",
        "particulars":  "Amaranthus (all varieties) (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-2",
        "pricePerKg":  300,
        "rawPriceText":  "300.00",
        "slNo":  "2",
        "particulars":  "Palak seeds (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-3",
        "pricePerKg":  1500,
        "rawPriceText":  "1500.00",
        "slNo":  "3",
        "particulars":  "Annual Moringa seeds (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-4",
        "pricePerKg":  600,
        "rawPriceText":  "600.00",
        "slNo":  "4",
        "particulars":  "Ashgourd seeds (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-5",
        "pricePerKg":  1000,
        "rawPriceText":  "1000.00",
        "slNo":  "5",
        "particulars":  "Bhendi hybrid Co Bh.H.1",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-6",
        "pricePerKg":  150,
        "rawPriceText":  "150.00",
        "slNo":  "6",
        "particulars":  "Bhendi seeds (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-7",
        "pricePerKg":  500,
        "rawPriceText":  "500.00",
        "slNo":  "7",
        "particulars":  "Bottle gourd",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-8",
        "pricePerKg":  600,
        "rawPriceText":  "600.00",
        "slNo":  "8",
        "particulars":  "Bitter gourd (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-9",
        "pricePerKg":  2000,
        "rawPriceText":  "2000.00",
        "slNo":  "9",
        "particulars":  "Bitter gourd CoBGoH 1 hybrid",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-10",
        "pricePerKg":  10000,
        "rawPriceText":  "10,000.00",
        "slNo":  "10",
        "particulars":  "Bitter gourd â€“ parents of CoBGoH 1 hybrid bitter gourd",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-11",
        "pricePerKg":  250,
        "rawPriceText":  "250.00",
        "slNo":  "11",
        "particulars":  "Bottle gourd (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-12",
        "pricePerKg":  600,
        "rawPriceText":  "600.00",
        "slNo":  "12",
        "particulars":  "Brinjal seeds (TFL) Co2",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-13",
        "pricePerKg":  5000,
        "rawPriceText":  "5000.00",
        "slNo":  "13",
        "particulars":  "Brinjal (parents of COBGHOH â€“ 1) CoBH.2",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-14",
        "pricePerKg":  70,
        "rawPriceText":  "70.00",
        "slNo":  "14",
        "particulars":  "Butter bean seed (local) TFL",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-15",
        "pricePerKg":  500,
        "rawPriceText":  "500.00",
        "slNo":  "15",
        "particulars":  "Chilli",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-16",
        "pricePerKg":  200,
        "rawPriceText":  "200.00",
        "slNo":  "16",
        "particulars":  "Cluster bean",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-17",
        "pricePerKg":  25000,
        "rawPriceText":  "25000",
        "slNo":  "17",
        "particulars":  "Dolichos (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-18",
        "pricePerKg":  1500,
        "rawPriceText":  "1500.00",
        "slNo":  "18",
        "particulars":  "Drumstick (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-19",
        "pricePerKg":  100,
        "rawPriceText":  "100.00",
        "slNo":  "19",
        "particulars":  "French bean",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-20",
        "pricePerKg":  10,
        "rawPriceText":  "10.00",
        "slNo":  "20",
        "particulars":  "Fenugreek bulk seed",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-21",
        "pricePerKg":  100,
        "rawPriceText":  "100.00",
        "slNo":  "21",
        "particulars":  "Fenugreek seed (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-22",
        "pricePerKg":  80,
        "rawPriceText":  "80.00",
        "slNo":  "22",
        "particulars":  "French bean seeds per kg",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-23",
        "pricePerKg":  100,
        "rawPriceText":  "100.00",
        "slNo":  "23",
        "particulars":  "Green peas seeds (samba local types) TFL",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-24",
        "pricePerKg":  100,
        "rawPriceText":  "100.00",
        "slNo":  "24",
        "particulars":  "Garden pea",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-25",
        "pricePerKg":  1,
        "rawPriceText":  "1.00/seedling",
        "slNo":  "25",
        "particulars":  "Hybrid tomato seedling (plug planted)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-26",
        "pricePerKg":  300,
        "rawPriceText":  "300.00",
        "slNo":  "26",
        "particulars":  "Kong kong (greens) TFL",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-27",
        "pricePerKg":  1,
        "rawPriceText":  "1.00",
        "slNo":  "27",
        "particulars":  "Hybrid Tomato seedling (plug planted) 1 No",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-28",
        "pricePerKg":  1500,
        "rawPriceText":  "1500.00",
        "slNo":  "28",
        "particulars":  "Aggregatum onion seed (Co(On)5)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-29",
        "pricePerKg":  200,
        "rawPriceText":  "200/g",
        "slNo":  "29",
        "particulars":  "Chilli Hybrid - Parental lines male and female parents for contract seed production",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-30",
        "pricePerKg":  20,
        "rawPriceText":  "20.00",
        "slNo":  "30",
        "particulars":  "Kitchen garden/sample seed packets of vegetable (3 to 4 crops)/packet",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-31",
        "pricePerKg":  5,
        "rawPriceText":  "5.00",
        "slNo":  "31",
        "particulars":  "Vegetable Kitchen garden/ample seed packets (single crop/packet)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-32",
        "pricePerKg":  20,
        "rawPriceText":  "20/packet",
        "slNo":  "32",
        "particulars":  "Kitchen garden packet/vegetable â€“ sample seed packet",
        "unit":  "packet",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-33",
        "pricePerKg":  250,
        "rawPriceText":  "250.00",
        "slNo":  "33",
        "particulars":  "Lab-lab (vegetable) TFL (CoGB-1A)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-34",
        "pricePerKg":  900,
        "rawPriceText":  "900.00",
        "slNo":  "34",
        "particulars":  "Long melon",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-35",
        "pricePerKg":  1000,
        "rawPriceText":  "1000.00",
        "slNo":  "35",
        "particulars":  "Musk melon",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-36",
        "pricePerKg":  500,
        "rawPriceText":  "500.00",
        "slNo":  "36",
        "particulars":  "Onion (Bellary)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-37",
        "pricePerKg":  20,
        "rawPriceText":  "20.00",
        "slNo":  "37",
        "particulars":  "Onion seed bulb (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-38",
        "pricePerKg":  500,
        "rawPriceText":  "500.00",
        "slNo":  "38",
        "particulars":  "Pumpkin seed (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-39",
        "pricePerKg":  50,
        "rawPriceText":  "50.00",
        "slNo":  "39",
        "particulars":  "Radish seed",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-40",
        "pricePerKg":  400,
        "rawPriceText":  "400.00",
        "slNo":  "40",
        "particulars":  "Ribbed gourd seed (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-41",
        "pricePerKg":  250,
        "rawPriceText":  "250.00",
        "slNo":  "41",
        "particulars":  "Ridge gourd",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-42",
        "pricePerKg":  800,
        "rawPriceText":  "800.00",
        "slNo":  "42",
        "particulars":  "Snake gourd",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-43",
        "pricePerKg":  600,
        "rawPriceText":  "600.00",
        "slNo":  "43",
        "particulars":  "Tomato varieties (TFL)",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-44",
        "pricePerKg":  20000,
        "rawPriceText":  "20000.00",
        "slNo":  "44",
        "particulars":  "Tomato â€“ Hybrid CoTH1",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-45",
        "pricePerKg":  100000,
        "rawPriceText":  "1,00,000.00",
        "slNo":  "45",
        "particulars":  "Tomato â€“ parents of CoTH-1 Hybrid Tomato",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-46",
        "pricePerKg":  200,
        "rawPriceText":  "200/g",
        "slNo":  "46",
        "particulars":  "Tomato â€“ CoTH2 â€“ Male parent",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-veg-47",
        "pricePerKg":  200,
        "rawPriceText":  "200/g",
        "slNo":  "47",
        "particulars":  "Tomato â€“ CoTH2 â€“ Female parent",
        "unit":  "kg",
        "category":  "Vegetable Seeds"
    },
    {
        "id":  "seed-breed-1",
        "pricePerKg":  300,
        "rawPriceText":  "300.00",
        "slNo":  "48",
        "particulars":  "Amaranthus",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-2",
        "pricePerKg":  770,
        "rawPriceText":  "770.00",
        "slNo":  "49",
        "particulars":  "Ash gourd",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-3",
        "pricePerKg":  220,
        "rawPriceText":  "220.00",
        "slNo":  "50",
        "particulars":  "Bhendi",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-4",
        "pricePerKg":  720,
        "rawPriceText":  "720.00",
        "slNo":  "51",
        "particulars":  "Brinjal",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-5",
        "pricePerKg":  390,
        "rawPriceText":  "390.00",
        "slNo":  "52",
        "particulars":  "Bottle gourd",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-6",
        "pricePerKg":  500,
        "rawPriceText":  "500.00",
        "slNo":  "53",
        "particulars":  "Bitter gourd",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-7",
        "pricePerKg":  600,
        "rawPriceText":  "600.00",
        "slNo":  "54",
        "particulars":  "Bhendi hybrid",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-8",
        "pricePerKg":  2000,
        "rawPriceText":  "2000.00",
        "slNo":  "55",
        "particulars":  "Bitter gourd CoBgH-1",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-9",
        "pricePerKg":  10000,
        "rawPriceText":  "10,000.00",
        "slNo":  "56",
        "particulars":  "Bitter gourd parents",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-10",
        "pricePerKg":  10000,
        "rawPriceText":  "10,000.00",
        "slNo":  "57",
        "particulars":  "Brinjal parents",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-11",
        "pricePerKg":  700,
        "rawPriceText":  "700.00",
        "slNo":  "58",
        "particulars":  "Chilli",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-12",
        "pricePerKg":  110,
        "rawPriceText":  "110.00",
        "slNo":  "59",
        "particulars":  "Cluster bean",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-13",
        "pricePerKg":  150,
        "rawPriceText":  "150.00",
        "slNo":  "60",
        "particulars":  "French bean",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-14",
        "pricePerKg":  125,
        "rawPriceText":  "125.00",
        "slNo":  "61",
        "particulars":  "Lab Lab",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-15",
        "pricePerKg":  660,
        "rawPriceText":  "660.00",
        "slNo":  "62",
        "particulars":  "Onion",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-16",
        "pricePerKg":  500,
        "rawPriceText":  "500.00",
        "slNo":  "63",
        "particulars":  "Pumpkin",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-17",
        "pricePerKg":  390,
        "rawPriceText":  "390.00",
        "slNo":  "64",
        "particulars":  "Ridge gourd",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-18",
        "pricePerKg":  1000,
        "rawPriceText":  "1000.00",
        "slNo":  "65",
        "particulars":  "Snake gourd",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-19",
        "pricePerKg":  1540,
        "rawPriceText":  "1540.00",
        "slNo":  "66",
        "particulars":  "Tomato",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-20",
        "pricePerKg":  10,
        "rawPriceText":  "10.00",
        "slNo":  "67",
        "particulars":  "Sample seed packet of vegetable crops (large)",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-breed-21",
        "pricePerKg":  5,
        "rawPriceText":  "5.00",
        "slNo":  "68",
        "particulars":  "Sample seed packet of vegetable crops (small)",
        "unit":  "kg",
        "category":  "Breeder Seeds (Vegetables)"
    },
    {
        "id":  "seed-flower-1",
        "pricePerKg":  1000,
        "rawPriceText":  "1000.00/kg",
        "slNo":  "1",
        "particulars":  "SeedsÂ - Flower seeds / kg",
        "unit":  "kg",
        "category":  "Flower \u0026 Tree Seeds"
    },
    {
        "id":  "seed-flower-2",
        "pricePerKg":  10,
        "rawPriceText":  "10.00/pkt",
        "slNo":  "2",
        "particulars":  "Seeds â€“ Flower seeds / packet",
        "unit":  "packet",
        "category":  "Flower \u0026 Tree Seeds"
    },
    {
        "id":  "seed-flower-3",
        "pricePerKg":  250,
        "rawPriceText":  "250.00/kg",
        "slNo":  "3",
        "particulars":  "Seeds â€“ Ornamental tree seeds (Ordinary) / kg",
        "unit":  "kg",
        "category":  "Flower \u0026 Tree Seeds"
    },
    {
        "id":  "seed-flower-4",
        "pricePerKg":  500,
        "rawPriceText":  "500.00/kg",
        "slNo":  "4",
        "particulars":  "Seeds â€“ Ornamental tree seeds (Choice â€“ Except Fish Tail palm)",
        "unit":  "kg",
        "category":  "Flower \u0026 Tree Seeds"
    },
    {
        "id":  "seed-flower-5",
        "pricePerKg":  300,
        "rawPriceText":  "300.00/kg",
        "slNo":  "5",
        "particulars":  "Seeds â€“ Fish tail palm (Caryota) seeds",
        "unit":  "kg",
        "category":  "Flower \u0026 Tree Seeds"
    },
    {
        "id":  "seed-med-1",
        "pricePerKg":  300,
        "rawPriceText":  "300.00/kg",
        "slNo":  "1",
        "particulars":  "Seeds of Medicinal plants except Keela Nelli",
        "unit":  "kg",
        "category":  "Medicinal Plant Seeds"
    },
    {
        "id":  "seed-med-2",
        "pricePerKg":  750,
        "rawPriceText":  "750.00/kg",
        "slNo":  "2",
        "particulars":  "Keelanelli seeds",
        "unit":  "kg",
        "category":  "Medicinal Plant Seeds"
    },
    {
        "id":  "seed-med-3",
        "pricePerKg":  5,
        "rawPriceText":  "5.00/packet",
        "slNo":  "3",
        "particulars":  "Sample seed packet of medicinal plants 5g",
        "unit":  "packet",
        "category":  "Medicinal Plant Seeds"
    }
];
