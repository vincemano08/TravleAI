# Travel Planner AI Projekt Dokumentáció

*  Tisztában vagyok vele, hogy az eredetileg leadott feladatok közül egy olyan témát választottam, amely egy adott régió vagy ország alapján végez kiberbiztonsági fenyegetettség-elemzést (Kiberbiztonsági fenyegetettség-elemző IP-cím/ország alapján). Azonban a megvalósítás során nem találtam olyan ingyenesen és szabadon elérhető API-t, amely lehetővé tette volna ennek megvalósítását, ezért a projekt témáját megváltoztattam.

*  Az új alkalmazás lényege, hogy a felhasználó megad egy úti célt (és opcionálisan egy képet), és az AI ennek alapján megtervez számára egy utazást. Az utazási terveket az alkalmazás el tudja menteni, valamint egy külön fülön lehetőséget biztosít repülőjáratok keresésére(pl. a kiválasztott úti célhoz).
*  **Fun fact:** a járatkeresésnél elegendő a város nevét megadni, mivel a Google Gemini API automatikusan felismeri a városnevet, és előállítja belőle az IATA-kódot, amelyet az API a lekérdezésekhez használni tud.

*  A nevem **Gyulavári Vince** (NEPTUN: PIDMKX). A feladat kidolgozását a múlt hétvégén kezdtem el, jelenleg körülbelül 13–15 óra fejlesztési munka van benne. Az alkalmazás főbb funkciói és lényegi részei már működnek, azonban a leadás időpontjában a bejelentkezési rendszer még nem üzemel – ezt igyekszem minél hamarabb javítani. (EDIT: az auth már működik, de a confirmation email a localhost:3000-re redirectál, mivel nincsen valós weboldalam, de ez nem probléma, mert a regisztrációhoz nem szükséges az email konfirmálás. Regisztráció után be lehet lépni a Sign In gombbal.)

## Tech Stack amit használok

*   **Frontend:** React Native TypeScript-tel, Expo-val és Expo Routerrel
*   **UI keretrendszer:** React Native Paper
*   **Backend és autentikáció:** Supabase (felhasználói hitelesítés, adatbázis a szöveges adatokhoz)
*   **AI-feldolgozás:** Google AI Studio (Gemini API)
*   **Járatkeresés:** SerpAPI (Google Flights interfész)

## Tapasztalatok, tanulságok

*   Sokkal nehezebb a „vibe coding", mint ahogy én azt gondoltam volna.
*   Kifejezetten nehéz bármilyen működő szoftvert létrehozni úgy, hogy csak egy koncepció van meg a fejben, és nem szeretnél valós kódot írni.
*   Az AI segítségével sokat lehet haladni, főleg a hibakeresés során, de gyakran olyan specifikus hibák merülnek fel, amelyekhez emberi beavatkozás elengedhetetlen. A hibakeresés így is rengeteg időt felemészt.
*   A Google AI API válaszideje sajnos meglehetősen lassú; előfordul, hogy akár egy percet is várni kell egy válaszra – ezen sajnos nem tudtam javítani.
*   A legnagyobb kihívást a Supabase megfelelő beállítása, valamint a megfelelő repülőjárat-kereső API megtalálása jelentette. A legtöbb ilyen API (pl. Kiwi.com) affiliate rendszerhez kötött, amelyhez külön jelentkezni kellett volna.

## Használt AI modellek
*   **Google Gemini 2.5 Pro Experimental (05.06)**: Jelenleg a legjobb, legújabb modell, és emellett még ingyenes is a Google AI Studio-ban. Egyetlen gond vele, hogy nem struktúrálja olyan jól a válaszait.
*   **Google Gemini 2.5 Pro (04.17)**: Ez van beépítve az általam használt Cursor AI("VS Code skin made for vibe coding")-ba, és a VS Code-ba (amit akkor kezdtem el használni, amint elfogyott a quotám a Cursor-ban), mint legjobb modell.
*   **xAI Grok 3**: Jelenleg a kedvenc modellem. A válaszai pontosak, jól struktúráltak, és személyessebb, emberiebb mint a többi AI.
*   **OpenAI ChatGPT modellek**: Ezeket legfőkébb magyarázásra és szövegfogalmazásra használom, mivel az alap ingyenes tervben nincsen chain of thought modell, így erre nem bíznék kódolást vagy matekot.
*   **Anthropic Claude Sonnet 3.7 (Thinking)**: Egyedül a copilotban használom, mert a webes felületen nagyon minimális a quota. Nagyon okos és jó válaszokat ad, de tapasztalataim szerint ennek a legkisebb a context window-ja. Elég frusztráló tud lenni, amikor újra kell kezdeni egy beszélgetést a nulláról.

Prompt példákat nem nagyon tudok adni, mert nagyon sok különbőző AI-jal nagyon sok különböző session-ben beszéltam, és nem tudtam volna feljegyezni őket.

## Utolsó megjegyzések
*   Mivel nem sikerült működő production apk-t buildelni, ezért egy demo-t is feeltöltöttem a  [Google Drive](https://drive.google.com/drive/folders/1Zq4G37Nbn99VMn4eMl3L7cGqmHjNuTub?usp=sharing)-ra. A demoban minden funkció megjelenik, kivéve a regisztráció. Ezt azért nem tudtam demozni, mert már nem volt több kamu email-címem. 
*  **Problémák a buildelésnél**
    *   A production build debug-olása során kiderült, hogy az API kulcsokat nem találja a bundler. (Nagyyn sokat szívtam vele, hogy ezt megoldjam, de nem sikerült 🫠)
    *   Az EAS (Expo Application Services) cloudban való buildelésnél hatalmas sorok vannak. Nem is a buildelés a leghosszabb idő, hanem a queue-ban való várakozás. A buildeléshez 2-3 órát kellett várnom, és a buildelés végén kb. 10 percig tartott. (Kivéve amikor error-t dobott, akkor csak 5 perc 😁)
    *  Nagyon nehéz volt kiigazodni a buildeléshez szükséges rengeteg config .json fileban. Ráadásul, ebben még az AI sem tudott segíteni, mert vagy elavult információkat szolgáltatott, vagy *straight up* halucinállt.

Jelenleg a buildelt apk (a driveban) nem funkcionális, de nem hiszem, hogy lenne erőforrásom fixálni most így utolsó héten.

<br><br><br><br><br><br><br><br>

Ehhez a dokumentációhoz itt a prompt:
Fogalmazd meg ezt szepen:
Tudom, hogy a leadott feladatoknal egy olyan feladatot valasztottam, ami regio/orszag alapjan analizalja a kiberbiztonsagi fenyegetettseget(Kiberbiztonsági fenyegetettség-elemző IP-cím/ország alapján). De ehhez nem talaltam megfelelo, elerheto API-t amiert ne kellett volna fizetni, ezert uj feladatot valasztottam. Az uj app lenyege, hogy a felhasznalo bead egy uticelt(es akar egy kepet) es az AI tervez neki egy utazast, az alapjan. Ezeket kepes elmenteni es kepes meg az adott helyre egy masik fulon flightokat lekerni. (Fun fact: A jarat keresesnel eleg a varos nevet beadni, mert azt Gemini oldja meg, hogy abbol IATA code legyen amit az API fel tud hasznalni) A nevem gyulavári Vince. A feladat megoldasat mult het hetvegen kezdtem el megoldani, korulbelul 13-15 ora munka van benne. A nagy resze es a lenyeges resze az appnak mukodik, de a leadas idopontjaban a bejelentkezes nem mukodik, ezt megprobalom fixalni. Az API-ok amiket hasznalok az a Google Gemini API, a Supabase-t a user authra (sign in/up), SerpAPI-nak a google flightsos reszet. Legnehezebb resz valoszinuleg a supabase setup volt es a megfelelo repulojarattalalo api megtalalasa. A legtobb ilyen API, pl a kiwi-jé is affiliate program volt, amire jelentkezni kellett volna kulon. Tech stack amit hasznalok:
Tech Stack
Frontend: React Native with TypeScript, Expo, and Expo Router
UI Framework: React Native Paper
Authentication & Backend: Supabase (Auth, Database for textual data)
AI Processing: Google AI Studio API 
Flight Search: SerpAPI GoogleFlights
Tanulsagok: Nem olyan egyszeru vibecodelolni, mint amennyire hittem volna, nagyon nehez, ugy megirni barmilyen softwaret, hogy csak a koncepcio van  meg es nem szeretnel valos kodot irni. A debugging reszehez ert az AI, de gyakran merulnek fel nagyon specifikus hibak, amikor emberi beavatkozasra van szukseg. Igy is nagyon sok idot el lehet pazarolni debugolasra... A google API nagyon lelassult, akar egy percbe is telik mig erkezik valasz, azt meg kell varni, ezen nem tudtam javitani.

