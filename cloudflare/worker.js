const ROOM_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Player-Token',
};

const RANDOM_NAME_ADJECTIVES = [
  'Happy','Joyful','Cheerful','Delighted','Excited','Calm','Relaxed','Peaceful','Focused','Driven','Patient','Brave','Fearless','Bold','Daring','Valiant',
  'Curious','Clever','Sharp','Witty','Wise','Brilliant','Creative','Imaginative','Playful','Friendly','Kind','Gentle','Honest','Loyal','Noble','Humble',
  'Confident','Proud','Radiant','Glorious','Heroic','Legendary','Epic','Magnetic','Charming','Elegant','Graceful','Agile','Swift','Mighty','Resilient','Steady',
  'Dynamic','Energetic','Electric','Fiery','Icy','Cool','Sunny','Stormy','Dreamy','Cosmic','Golden','Silver','Crimson','Azure','Emerald','Ivory',
  'Amber','Vivid','Classic','Modern','Royal','Sincere','Thoughtful','Helpful','Polite','Honorable','Passionate','Careful','Eager','Smiling','Hopeful','Optimistic',
  'Moody','Serious','Silent','Noisy','Wild','Gritty','Savage','Tough','Restless','Nervous','Shy','Awkward','Clumsy','Lazy','Sleepy','Hungry',
  'Sassy','Funny','Goofy','Chaotic','Dramatic','Mysterious','Reckless','Stubborn','Messy','Tiny','Tall','Short','Strong','Slim','Flashy','Stylish',
  'Grumpy','Angry','Irritable','Bitter','Jealous','Envious','Gloomy','Pessimistic','Cynical','Sarcastic','Bossy','Rude','Mean','Cruel','Harsh','Cold',
  'Arrogant','Egotistic','Impulsive','Impatient','Anxious','Panicky','Paranoid','Suspicious','Defensive','Spiteful','Grudging','Guilty','Ashamed','Toxic','Troubled','Unstable',
  'Annoyed','Cranky','Snappy','MoodyAF','Doubtful','Petty','Salty','Nasty','Hostile','Bored','Melancholic','Doomy','Skeptical','Snobbish','Whiny','Glum',
  'Goofy','Clownish','MemeLord','BananaMode','Wacky','Nutty','Zany','Silly','Cheeky','Derpy','Giggly','Snorty','Jokey','Pranky','FunkyChicken','Disco',
  'Tall','Short','Tiny','Giant','Strong','Slim','Chubby','Skinny','Muscular','Lean','Wide','Narrow','BroadShouldered','LongLegged','FastFooted','SlowPaced',
  'Freckled','Pale','Tanned','Curly','StraightHaired','Braided','Bearded','Bald','SharpEyed','SleepyEyed','LoudVoiced','SoftSpoken','LeftHanded','RightHanded','Fit','Wobbly',
  'Vintage','Sporty','Urban','Casual','Formal','Funky','Quirky','Lucky','Unlucky','Balanced','Neutral','Zen','Hyper','Chill','Prime','Ultra'
];

const RANDOM_NAME_PEOPLE = [
  // Moroccan / Maghrebi
  'Amir','Yasmine','Karim','Nadia','Samir','Leila','Rachid','Salma','Amina','Youssef','Hakim','Imane','Zineb','Omar','Anas','Soufiane','Hamza','Khadija','Nabil','Meriem','Tarik','Ayoub','Ibtissam','Naima',
  // Catalan / Iberian (expanded, with many female + athlete/soccer names)
  'Jordi','Nuria','Pol','Laia','Marc','Jana','Pau','Berta','Sergi','Joan','Martina','Arnau','Aina','Ona','Mariona','Biel','Jan','Pere','Aleix','Roser','Oriol','Mireia','Carles','Marti','Montserrat','Gemma','Neus','Adria','Xavi','Ferran','Gerard','Nil','Roc','Blai','Judit','Txell',
  'Ariadna','Noelia','Naiara','Clara','Nora','Helena','Ivet','Bruna','Queralt','Celia','Mar','Carlota','Paula','Irene','Anna','Joana','Marta','Nerea','Laura','Alba',
  'PauGasol','MarcGasol','RickyRubio','AlexAbrines','RaulEntrerrios','AlexCorretja','CarlosAlcaraz','Garbiñe','RafaNadal','JorgeMartin',
  'Puyol','Busquets','Alba','Pique','Valdes','XaviHernandez','Iniesta','Pedro','CescFabregas','SergiRoberto','ThiagoAlcantara','Bojan','Muniesa','Bartra','Deulofeu','JoanGarcia','DaniOlmo','AleixGarcia','EricGarcia','Cubarsi',
  // Italian names
  'Luca','Giulia','Francesca','Marco','Alessandro','Giovanni','Matteo','Chiara','Elisa','Sofia','Giorgia','Riccardo','Davide','Federico','Paolo','Marta','Gabriele','Simone','Alessia','Franco',
  // FC Barcelona current/previous + football-inspired
  'Messi','Ronaldo','Neymar','Mbappe','Modric','Iniesta','Xavi','Salah','Benzema','Lewandowski','Pedri','Gavi','Lamine','Aitana','Putellas','Bonmati','Haaland','Bellingham','Vinicius','Yamal',
  'TerStegen','Cubarsi','Araujo','Kounde','Balde','Raphinha','Fermin','Olmo','DeJong','Ansu','Pique','Busquets','Alba','Suarez','Rakitic','Puyol','Valdes','Rivaldo','Ronaldinho','EtoO',
  // Philosophers / thinkers (expanded)
  'Socrates','Plato','Aristotle','Hypatia','Averroes','Avicenna','Descartes','Spinoza','Nietzsche','Kant','Voltaire','Rousseau','Confucius','Laozi','HannahArendt','SimoneDeBeauvoir','Diogenes','Epicurus','Zeno','Heraclitus',
  'Parmenides','Anaxagoras','Anaximander','Thales','Plotinus','Boethius','Aquinas','Ockham','Machiavelli','Hobbes','Locke','Hume','Berkeley','Leibniz','Schopenhauer','Kierkegaard','Heidegger','Sartre','Camus','Foucault',
  'Derrida','Deleuze','MerleauPonty','Wittgenstein','Russell','Popper','Rawls','Nozick','Nussbaum','Butler','Spivak','Arendt','Buber','Jaspers','Comte','Durkheim','Weber','Gramsci','Benjamin','Adorno',
  // Writers / poets / playwrights
  'Shakespeare','Cervantes','Dante','Homer','Virgil','Goethe','Tolstoy','Dostoevsky','Proust','Kafka','Borges','Neruda','Lorca','Woolf','Austen','Hemingway','Orwell','Camus','Moliere','Balzac',
  'GarciaMarquez','IsabelAllende','UmbertoEco','Calvino','Pessoa','Saramago','Murasaki','Tagore','Byron','Keats','Shelley','Whitman','Dickens','Joyce','Nabokov','Rimbaud','Baudelaire','Poe','Twain','Hugo',
  // Guitarists / rock stars / musicians / composers
  'Mozart','Beethoven','Bach','Vivaldi','Chopin','Tchaikovsky','Ravel','Debussy','Bizet','Verdi','Paganini','Liszt','Mahler','Puccini','Stravinsky','Handel','Haydn','SaintSaens','Sibelius','Grieg',
  'Hendrix','Clapton','Page','Gilmour','Iommi','Slash','Santana','VanHalen','Frusciante','Knopfler','BrianMay','Petrucci','Vai','Satriani','Malmsteen','Dimebag','Hetfield','Cobain','Lennon','McCartney',
  'FreddieMercury','Bowie','Jagger','Plant','AxlRose','Ozzy','Bono','ThomYorke','ChrisCornell','EddieVedder','Shakira','Rihanna','Adele','Beyonce','DuaLipa','Rosalia','Stromae','KarolG','EdSheeran','Sia',
  // Athletes (multi-sport)
  'Jordan','Kobe','LeBron','Curry','Nadal','Federer','Djokovic','Alcaraz','Bolt','Phelps','Biles','Serena','Ali','Tyson','Hamilton','Verstappen','Senna','Rafaela','Ingebrigtsen','Kipchoge',
  'Marquez','Rossi','Contador','Pogacar','Evenepoel','Ledecky','Shiffrin','Ohtani','Brady','Mahomes','CaitlinClark','Donovan','Haaland','Yulimar','Duplantis','NoahLyles','SimoneBiles','Marta','Riner','NaimSuleymanoglu',
  // Historical leaders / emperors / queens
  'Augustus','Hadrian','MarcusAurelius','Cleopatra','Akbar','Saladin','Catherine','Elizabeth','Victoria','Napoleon','Charlemagne','WuZetian','Hatshepsut','Cyrus','Pericles','Leonidas','Tutankhamun','Nefertiti','Isabella','Ferdinand',
  'Justinian','Constantine','Trajan','Aurelian','Genghis','Kublai','Ashoka','Darius','Xerxes','JuliusCaesar','Octavian','Theodora','Boudica','Sejong','MansaMusa','Meiji','PeterTheGreat','Ivan','Suleiman','MariaTheresa',
  // Fictional characters
  'Sherlock','Athena','Hermione','Frodo','Aragorn','Legolas','Leia','Anakin','Neo','Trinity','Katniss','Arya','Geralt','Yennefer','Zelda','Mario','LaraCroft','Spock','Picard','Wednesday',
  'Gandalf','DarthVader','LukeSkywalker','HanSolo','TonyStark','NatashaRomanoff','Batman','Joker','HarleyQuinn','Spiderman','Wolverine','Deadpool','Kratos','MasterChief','Ezio','GeronimoStilton','Tintin','Asterix','Obelix','Moana',
  'Superman','WonderWoman','Flash','Aquaman','GreenLantern','DoctorStrange','ScarletWitch','BlackPanther','CaptainMarvel','Thor','Loki','Hulk','IronMan','BlackWidow','Hawkeye','AntMan','Venom','Magneto','Storm','ProfessorX',
  'Sonic','Tails','Knuckles','Pikachu','Charizard','Mewtwo','Link','Ganondorf','Samus','Kirby','DonkeyKong','Yoshi','Bowser','Luigi','Peach','Cloud','Sephiroth','Tifa','Aerith','Sora',
  'Dumbledore','Snape','Voldemort','Hagrid','RonWeasley','LunaLovegood','DracoMalfoy','SiriusBlack','RemusLupin','Bellatrix','Eleven','JonSnow','Daenerys','Tyrion','Sansa','BranStark','Cersei','JaimeLannister','TheHound','TheMandalorian',
  // Stranger Things
  'Will','Mike','Dustin','Lucas','Max','Billy','Hopper','Joyce','Steve','Robin','Nancy','Jonathan','Erica','Bob','Alexei','Murray','Argyle','Eddie','Vickie','Suzie',
  // More fictional
  'Grogu','Ahsoka','Padme','Kenobi','Rey','Finn','PoeDameron','KyloRen','BoKatan','CaptainPicard','Data','SevenOfNine','Ripley','SarahConnor','Ellen','MaxRockatansky','IndianaJones','JackSparrow','ElizabethSwann','OptimusPrime',
  // Russian / Slavic sounding
  'Dmitri','Anastasia','Svetlana','Mikhail','Nikolai','Irina','Viktor','Tatiana','Yelena','Sergei','Olga','Boris','Ekaterina','Alexei','Marina','Roman','Natasha','Ilya','Yuri','Vera','Mila','Ludmila','Stanislav','Galina',
  // South American sounding
  'Mateo','Sofia','Valentina','Santiago','Camila','Thiago','Lucia','Valeria','Diego','Emilia','Lautaro','Antonella','Agustin','Renata','Bruno','Gael','Julieta','Franco','Bianca','Enzo','Milagros','Facundo','Thiaguito','Benicio',
  // Global mixed
  'Aarav','Maya','Priya','Arjun','Noah','Liam','Emma','Olivia','Lucas','Mia','Elena','Nora','Leo','Hugo','Chloe','Zoe','Aiko','Kenji','Fatima','Yara','Ines','Samira','Noura','Kai',
  // Extra women-focused expansion (target ~50% women)
  'Maria','Laura','Sara','Julia','Claudia','Andrea','Patricia','Cristina','Silvia','Raquel','Beatriz','Teresa','Mónica','Veronica','Eva','Miriam','Noelia','Carla','Sonia','Lucia',
  'Daniela','Valeria','Camila','Juliana','Mariana','Gabriela','Isabela','Antonella','Renata','Bianca','Milagros','Catalina','Florencia','Agustina','Pilar','Lourdes','Alicia','Elisa','Ingrid','Natalia',
  'Frida','Rosalind','Ada','MarieCurie','Hypatia','MaryWollstonecraft','VirginiaWoolf','Simone','Hannah','JudithButler','AngelaDavis','Emmeline','RosaParks','Malala','Rigoberta','Greta','Amelia','ValentinaTereshkova','SallyRide','MaeJemison',
  'AlexMorgan','MeganRapinoe','LucyBronze','AdaHegerberg','CarolineGrahamHansen','MartaVieira','SamKerr','WendieRenard'
];

const FEMALE_NAME_HINTS = new Set([
  'yasmine','nadia','leila','salma','amina','imane','zineb','khadija','meriem','ibtissam','naima',
  'nuria','laia','jana','berta','martina','aina','ona','mariona','roser','mireia','montserrat','gemma','neus','judit','txell','ariadna','clara','nora','helena','ivet','bruna','queralt','celia','mar','carlota','paula','irene','anna','joana','marta','nerea','laura','alba',
  'alexiaputellas','aitanabonmati','mapileon','patriguijarro','claudiapina','marionacaldentey','vickylopez','sandrapaños','laiacodina','onabatlle','ireneparedes','jennihermoso','salmaparalluelo','martatorrejon','leilaouahabi','arisánchez','gemmatriay','mireiabelmonte',
  'giulia','francesca','chiara','elisa','sofia','giorgia','marta','alessia',
  'hypatia','hannaharendt','simonedebeauvoir','woolf','austen','isabelallende','murasaki',
  'rihanna','adele','beyonce','dualipa','rosalia','karolg','sia','shakira',
  'cleopatra','catherine','elizabeth','victoria','wuzetian','hatshepsut','nefertiti','isabella','theodora','boudica','mariatheresa',
  'athena','hermione','leia','trinity','katniss','arya','yennefer','zelda','laracroft','wednesday','wonderwoman','scarletwitch','captainmarvel','blackwidow','harleyquinn','peach','tifa','aerith','lunalovegood','bellatrix','daenerys','sansa','cersei','ahsoka','padme','rey','bokatan','ripley','sarahconnor','ellen','elizabethswann',
  'anastasia','svetlana','irina','tatiana','yelena','olga','ekaterina','marina','natasha','vera','mila','ludmila','galina',
  'sofia','valentina','camila','lucia','valeria','emilia','antonella','renata','julieta','bianca','milagros',
  'maya','priya','emma','olivia','mia','elena','nora','chloe','zoe','aiko','fatima','yara','ines','samira','noura',
  'maria','sara','julia','claudia','andrea','patricia','cristina','silvia','raquel','beatriz','teresa','mónica','veronica','eva','miriam','noelia','carla','sonia','daniela','juliana','mariana','gabriela','isabela','florencia','agustina','pilar','lourdes','alicia','ingrid','natalia',
  'frida','rosalind','ada','mariecurie','marywollstonecraft','simone','judithbutler','angeladavis','emmeline','rosaparks','malala','rigoberta','greta','amelia','valentinatereshkova','sallyride','maejemison',
  'alexmorgan','meganrapinoe','lucybronze','adahegerberg','carolinegrahamhansen','martavieira','samkerr','wendierenard',
  'max','joyce','nancy','robin','erica','vickie','suzie','eleven'
]);

const BLOCKED_NICK_PATTERNS = [
  /\bnazi\b/i,
  /\bhitler\b/i,
  /\bterrorist\b/i,
  /\brape\b/i,
  /\bkill\s*yourself\b/i,
];

const ALLOWED_REACTIONS = new Set([
  '👍','👏','🔥','😂','🤯','🙌','☕','😮','🤔','👀','🧠','❤️','😅','😎','🫶','6️⃣','7️⃣'
]);
const MAX_ROOM_EVENTS = 4000;
const ASSIGNMENTS_DO_NAME = '__assignments_registry__';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'pinplay-api' });
    }

    // Serve quiz media (audio/images) from R2
    if (url.pathname.startsWith('/api/media/') && request.method === 'GET') {
      const key = url.pathname.replace('/api/media/', '');
      if (!key || key.length < 3) return json({ error: 'Invalid media path' }, 400);
      try {
        const obj = await env.QUIZ_MEDIA.get(key);
        if (!obj) return json({ error: 'File not found' }, 404);
        const headers = { 'Cache-Control': 'public, max-age=31536000' };
        if (key.endsWith('.mp3')) headers['Content-Type'] = 'audio/mpeg';
        else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) headers['Content-Type'] = 'image/jpeg';
        else if (key.endsWith('.png')) headers['Content-Type'] = 'image/png';
        else if (key.endsWith('.webp')) headers['Content-Type'] = 'image/webp';
        Object.assign(headers, CORS_HEADERS);
        return new Response(obj.body, { headers });
      } catch (e) {
        return json({ error: 'Failed to load media' }, 500);
      }
    }

    // List quizzes stored in R2
    if (url.pathname === '/api/quizzes' && request.method === 'GET') {
      try {
        // List quiz JSONs stored in R2 (prefix filter to be safe across jurisdictions)
        const listed = await env.QUIZ_MEDIA.list({ limit: 1000, prefix: 'quizzes/' });
        const quizzes = (listed.objects || [])
          .filter(obj => obj.key.endsWith('.json'))
          .map(obj => ({
            key: obj.key,
            pin: obj.key.replace('quizzes/', '').replace('.json', ''),
            size: obj.size,
            uploaded: obj.uploaded,
            title: obj.key.replace('quizzes/', '').replace('.json', '')
          }));
        // Fetch titles from quiz data
        for (const q of quizzes) {
          try {
            const obj = await env.QUIZ_MEDIA.get(q.key);
            if (obj) {
              const data = await obj.json();
              if (data?.title) q.title = data.title;
              if (data?.questions?.length) q.questionCount = data.questions.length;
            }
          } catch (e) { /* skip */ }
        }
        // Sort newest-first by uploaded timestamp (fallback to pin desc)
        quizzes.sort((a, b) => {
          const ta = a.uploaded ? new Date(a.uploaded).getTime() : 0;
          const tb = b.uploaded ? new Date(b.uploaded).getTime() : 0;
          if (ta !== tb) return tb - ta;
          return String(b.pin || '').localeCompare(String(a.pin || ''));
        });
        return json({ quizzes });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // Delete quiz JSON and associated media prefix from R2
    if (url.pathname.startsWith('/api/quizzes/') && request.method === 'DELETE') {
      try {
        const raw = url.pathname.replace('/api/quizzes/', '');
        if (!raw) return json({ error: 'quiz key required' }, 400);
        let key = raw.startsWith('quizzes/') ? raw : `quizzes/${raw}`;
        if (key.startsWith('quizzes/quizzes/')) key = key.replace(/^quizzes\//, '');
        if (!key.endsWith('.json')) key = `${key}.json`;
        const quizId = key.replace('quizzes/', '').replace('.json', '');

        // Delete the quiz JSON
        await env.QUIZ_MEDIA.delete(key);

        // Delete associated media under quizId/
        let deletedMedia = 0;
        const listed = await env.QUIZ_MEDIA.list({ prefix: `${quizId}/`, limit: 1000 });
        for (const obj of listed.objects || []) {
          await env.QUIZ_MEDIA.delete(obj.key);
          deletedMedia += 1;
        }

        return json({ ok: true, deletedMedia, deletedKey: key, quizId });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // Upload quiz JSON to R2
    if (url.pathname === '/api/quizzes/upload' && request.method === 'POST') {
      try {
        const body = await safeJson(request);
        const quizId = body?.quizId || `quiz-${Date.now()}`;
        const key = `quizzes/${quizId}.json`;
        await env.QUIZ_MEDIA.put(key, JSON.stringify(body.quiz || body), { httpMetadata: { contentType: 'application/json' } });
        return json({ ok: true, key, quizId });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // Upload quiz media to R2 (authenticated)
    if (url.pathname === '/api/media/upload' && request.method === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return json({ error: 'Use multipart/form-data' }, 400);
      }
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const path = formData.get('path');
        if (!file || !path) return json({ error: 'Missing file or path' }, 400);
        await env.QUIZ_MEDIA.put(path, file.stream(), {
          httpMetadata: { contentType: file.type }
        });
        return json({ ok: true, path, size: file.size });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    if (url.pathname === '/api/create' && request.method === 'POST') {
      const body = await safeJson(request);
      let quiz = body?.quiz;
      const options = body?.options || {};

      if (!quiz?.questions?.length) {
        return json({ error: 'Quiz must include at least one question.' }, 400);
      }

      // Auto-extract base64 media to R2 if QUIZ_MEDIA binding exists
      if (env.QUIZ_MEDIA) {
        const quizId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        quiz = JSON.parse(JSON.stringify(quiz)); // deep clone
        
        for (const q of quiz.questions || []) {
          for (const field of ['audioData', 'imageData']) {
            const val = q[field];
            if (val && typeof val === 'string' && val.startsWith('data:')) {
              const match = val.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                const mime = match[1];
                const binaryStr = atob(match[2]);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                const ext = mime.includes('mpeg') || mime.includes('mp3') ? '.mp3' 
                          : mime.includes('jpeg') || mime.includes('jpg') ? '.jpg'
                          : mime.includes('png') ? '.png' : '.bin';
                const key = `${quizId}/${field === 'audioData' ? 'audio' : 'images'}/${q.id || Math.random().toString(36).slice(2)}${ext}`;
                await env.QUIZ_MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
                q[field] = `https://pinplay-api.eugenime.workers.dev/api/media/${key}`;
                q.audioMode = field === 'audioData' ? 'file' : q.audioMode;
              }
            }
          }
        }
      }

      for (let i = 0; i < 15; i++) {
        const pin = makePin();
        const id = env.ROOMS.idFromName(pin);
        const stub = env.ROOMS.get(id);

        const initRes = await stub.fetch('https://room/init', {
          method: 'POST',
          body: JSON.stringify({ pin, quiz, options }),
        });

        if (initRes.status === 201) {
          const data = await initRes.json();
          // Also save quiz JSON to R2 for Cloud listing
          if (env.QUIZ_MEDIA) {
            const quizKey = `quizzes/${pin}.json`;
            try {
              await env.QUIZ_MEDIA.put(quizKey, JSON.stringify(quiz), {
                httpMetadata: { contentType: 'application/json' }
              });
            } catch (e) { /* non-critical */ }
          }
          return json(data, 201);
        }
      }

      return json({ error: 'Could not allocate PIN. Try again.' }, 503);
    }

    if (url.pathname === '/api/pin/check' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const clientId = sanitizeId(url.searchParams.get('clientId'));
      if (!pin) return json({ error: 'PIN must be 6 digits.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch(`https://room/pin/check?clientId=${encodeURIComponent(clientId)}`, {
          method: 'GET',
        }),
      );
    }

    if (url.pathname === '/api/join' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const name = sanitizeName(body?.name);
      const password = String(body?.password || '').slice(0, 120);
      const clientId = sanitizeId(body?.clientId);

      if (!pin) return json({ error: 'PIN must be 6 digits.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      const headers = {};
      if (env.STUDENT_LOGIN_VERIFY_URL) headers['X-Login-Verify-Url'] = String(env.STUDENT_LOGIN_VERIFY_URL);
      if (env.STUDENT_LOGIN_VERIFY_SECRET) headers['X-Login-Verify-Secret'] = String(env.STUDENT_LOGIN_VERIFY_SECRET);

      return withCors(
        await stub.fetch('https://room/join', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name, password, clientId }),
        }),
      );
    }

    if (url.pathname === '/api/host/state' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/state', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/events' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const token = readBearer(request);
      const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 120)));
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch(`https://room/host/events?limit=${encodeURIComponent(limit)}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/attempts' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/attempts', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/join' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      if (!pin) return json({ error: 'PIN required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/join', {
          method: 'POST',
        }),
      );
    }

    if (url.pathname === '/api/host/start' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/start', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/quiz/update' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/quiz/update', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ quiz: body?.quiz }),
        }),
      );
    }

    if (url.pathname === '/api/host/next' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/next', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/prev' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/prev', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/reveal' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/reveal', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    }

    if (url.pathname === '/api/host/settings' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/settings', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ randomNames: !!body?.randomNames }),
        }),
      );
    }

    if (url.pathname === '/api/host/kick' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/kick', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ playerId: sanitizeId(body?.playerId) }),
        }),
      );
    }

    if (url.pathname === '/api/create/auth' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      if (!password) return json({ error: 'Password required.' }, 400);

      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);
      return json({ ok: true }, 200);
    }

    if (url.pathname === '/api/assignments/create' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      if (!password) return json({ error: 'Password required.' }, 400);
      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);

      const quiz = normalizeQuiz(body?.quiz || {});
      if (!quiz.questions?.length) return json({ error: 'Quiz must include at least one valid question.' }, 400);

      const title = String(body?.title || quiz.title || '').trim().slice(0, 120) || 'Assignment';
      const className = sanitizeClassName(body?.className);
      const attemptsLimit = clamp(Math.round(Number(body?.attemptsLimit ?? 1)), 0, 10);
      const dueAtRaw = Number(body?.dueAt || 0);
      const dueAt = Number.isFinite(dueAtRaw) && dueAtRaw > 0 ? Math.round(dueAtRaw) : null;

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch('https://room/assignments/create', {
        method: 'POST',
        body: JSON.stringify({ title, className, attemptsLimit, dueAt, randomNames: !!body?.randomNames, feedbackMode: String(body?.feedbackMode || 'none'), quiz }),
      }));
    }

    if (url.pathname === '/api/assignments/list' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      if (!password) return json({ error: 'Password required.' }, 400);
      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);

      const limit = Math.max(1, Math.min(200, Number(body?.limit || 50)));
      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch(`https://room/assignments/list?limit=${encodeURIComponent(limit)}`, {
        method: 'GET',
      }));
    }

    if (url.pathname === '/api/assignments/results' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      const code = sanitizeAssignmentCode(body?.code);
      if (!password) return json({ error: 'Password required.' }, 400);
      if (!code) return json({ error: 'Assignment code required.' }, 400);

      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch(`https://room/assignments/results?code=${encodeURIComponent(code)}`, {
        method: 'GET',
      }));
    }

    if (url.pathname === '/api/assignments/grade' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      const code = sanitizeAssignmentCode(body?.code);
      const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
      const qIndex = Number(body?.qIndex);
      const points = Number(body?.points);
      const correction = String(body?.correction || '').slice(0, 400);

      if (!password) return json({ error: 'Password required.' }, 400);
      if (!code) return json({ error: 'Assignment code required.' }, 400);
      if (!attemptId) return json({ error: 'attemptId required.' }, 400);
      if (!Number.isFinite(qIndex)) return json({ error: 'qIndex required.' }, 400);
      if (!Number.isFinite(points)) return json({ error: 'points required.' }, 400);

      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch('https://room/assignments/grade', {
        method: 'POST',
        body: JSON.stringify({
          code,
          attemptId,
          qIndex: Math.round(qIndex),
          points,
          correction,
        }),
      }));
    }

    if (url.pathname === '/api/assignments/attempt' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      const code = sanitizeAssignmentCode(body?.code);
      const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
      if (!password) return json({ error: 'Password required.' }, 400);
      if (!code) return json({ error: 'Assignment code required.' }, 400);
      if (!attemptId) return json({ error: 'attemptId required.' }, 400);

      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch(`https://room/assignments/attempt?code=${encodeURIComponent(code)}&attemptId=${encodeURIComponent(attemptId)}`, {
        method: 'GET',
      }));
    }

    if (url.pathname === '/api/assignments/reopen-attempt' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      const code = sanitizeAssignmentCode(body?.code);
      const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
      if (!password) return json({ error: 'Password required.' }, 400);
      if (!code) return json({ error: 'Assignment code required.' }, 400);
      if (!attemptId) return json({ error: 'attemptId required.' }, 400);

      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch('https://room/assignments/reopen-attempt', {
        method: 'POST',
        body: JSON.stringify({ code, attemptId }),
      }));
    }

    if (url.pathname === '/api/assignments/toggle-active' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      const code = sanitizeAssignmentCode(body?.code);
      const active = !!body?.active;
      if (!password) return json({ error: 'Password required.' }, 400);
      if (!code) return json({ error: 'Assignment code required.' }, 400);

      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch('https://room/assignments/toggle-active', {
        method: 'POST',
        body: JSON.stringify({ code, active }),
      }));
    }

    if (url.pathname === '/api/assignments/delete' && request.method === 'POST') {
      const body = await safeJson(request);
      const password = String(body?.password || '');
      const code = sanitizeAssignmentCode(body?.code);
      if (!password) return json({ error: 'Password required.' }, 400);
      if (!code) return json({ error: 'Assignment code required.' }, 400);

      const ok = await verifyCreatePassword(env, password);
      if (!ok) return json({ error: 'Wrong password.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch('https://room/assignments/delete', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }));
    }

    if (url.pathname === '/api/assignment/get' && request.method === 'GET') {
      const code = sanitizeAssignmentCode(url.searchParams.get('code'));
      if (!code) return json({ error: 'Assignment code required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch(`https://room/assignments/get?code=${encodeURIComponent(code)}`, {
        method: 'GET',
      }));
    }

    if (url.pathname === '/api/player/random-name' && request.method === 'GET') {
      return withCors(json({ ok: true, name: pickRandomName({}) }));
    }

    if (url.pathname === '/api/assignment/start' && request.method === 'POST') {
      const body = await safeJson(request);
      const code = sanitizeAssignmentCode(body?.code);
      const studentKey = sanitizeAssignmentStudentKey(body?.studentKey);
      const studentName = sanitizeName(body?.studentName || body?.username || 'Student');
      const password = String(body?.password || request.headers.get('X-Student-Password') || '').trim();
      if (!code) return json({ error: 'Assignment code required.' }, 400);
      if (!studentKey) return json({ error: 'Student key required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));

      // Check assignment login mode and verify password if needed
      const getRes = await stub.fetch(`https://room/assignments/get?code=${encodeURIComponent(code)}`, {
        method: 'GET',
      });
      if (!getRes.ok) return withCors(getRes);
      const getData = await getRes.json();
      const assignment = getData?.assignment || null;

      if (assignment && assignment.randomNames === false) {
        if (!password) return withCors(json({ error: 'Username and password are required.' }, 401));

        const verifyUrl = String(env.STUDENT_LOGIN_VERIFY_URL || '').trim();
        const verifySecret = String(env.STUDENT_LOGIN_VERIFY_SECRET || '').trim();
        if (!verifyUrl) return withCors(json({ error: 'Login verification is not configured.' }, 501));

        try {
          const verifyHeaders = { 'Content-Type': 'application/json' };
          if (verifySecret) verifyHeaders['Authorization'] = `Bearer ${verifySecret}`;

          // Try original name and lowercase variant (same as live mode)
          const verifyNames = [studentName];
          const lowerName = sanitizeName ? sanitizeName(studentName).toLowerCase() : studentName.toLowerCase();
          if (lowerName && !verifyNames.includes(lowerName)) {
            verifyNames.push(lowerName);
          }

          let verified = false;
          const overrideUser = String(env.STUDENT_LOGIN_OVERRIDE_USER || '').trim();
          const overridePass = String(env.STUDENT_LOGIN_OVERRIDE_PASS || '').trim();
          if (overrideUser && overridePass && studentName === overrideUser && password === overridePass) {
            verified = true;
          }

          for (const candidateName of verifyNames) {
            if (verified) break;
            const vRes = await fetch(verifyUrl, {
              method: 'POST',
              headers: verifyHeaders,
              redirect: 'follow',
              body: JSON.stringify({ username: candidateName, password, pin: code, secret: verifySecret }),
            });
            const vTxt = await vRes.text();
            let parsed = {};
            try { parsed = vTxt ? JSON.parse(vTxt) : {}; } catch {}

            console.log('LOGIN_VERIFY:', { url: verifyUrl, username: candidateName, status: vRes.status, ok: vRes.ok, response: vTxt.slice(0, 200) });

            const success = vRes.ok && parsed && parsed.ok === true;
            if (success) {
              verified = true;
              break;
            }
          }

          if (!verified) {
            return withCors(json({ error: 'Invalid username or password.' }, 401));
          }
        } catch {
          return withCors(json({ error: 'Login verification service unavailable.' }, 502));
        }
      }

      return withCors(await stub.fetch('https://room/assignments/start', {
        method: 'POST',
        body: JSON.stringify({ code, studentKey, studentName }),
      }));
    }

    if (url.pathname === '/api/assignment/state' && request.method === 'GET') {
      const code = sanitizeAssignmentCode(url.searchParams.get('code'));
      const attemptId = sanitizeAssignmentAttemptId(url.searchParams.get('attemptId'));
      if (!code) return json({ error: 'Assignment code required.' }, 400);
      if (!attemptId) return json({ error: 'attemptId required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch(`https://room/assignments/state?code=${encodeURIComponent(code)}&attemptId=${encodeURIComponent(attemptId)}`, {
        method: 'GET',
      }));
    }

    // Student-facing attempt history endpoint
    if (url.pathname === '/api/assignment/attempts' && request.method === 'GET') {
      const code = sanitizeAssignmentCode(url.searchParams.get('code'));
      const studentKey = sanitizeAssignmentStudentKey(url.searchParams.get('studentKey'));
      if (!code) return json({ error: 'Assignment code required.' }, 400);
      if (!studentKey) return json({ error: 'Student key required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch(`https://room/assignments/results?code=${encodeURIComponent(code)}&studentKey=${encodeURIComponent(studentKey)}`, {
        method: 'GET',
      }));
    }

    if (url.pathname === '/api/assignment/answer' && request.method === 'POST') {
      const body = await safeJson(request);
      const code = sanitizeAssignmentCode(body?.code);
      const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
      const qIndex = Number(body?.qIndex);
      if (!code) return json({ error: 'Assignment code required.' }, 400);
      if (!attemptId) return json({ error: 'attemptId required.' }, 400);
      if (!Number.isFinite(qIndex)) return json({ error: 'qIndex required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch('https://room/assignments/answer', {
        method: 'POST',
        body: JSON.stringify({ code, attemptId, qIndex: Math.round(qIndex), answer: body?.answer }),
      }));
    }

    if (url.pathname === '/api/assignment/submit' && request.method === 'POST') {
      const body = await safeJson(request);
      const code = sanitizeAssignmentCode(body?.code);
      const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
      if (!code) return json({ error: 'Assignment code required.' }, 400);
      if (!attemptId) return json({ error: 'attemptId required.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(ASSIGNMENTS_DO_NAME));
      return withCors(await stub.fetch('https://room/assignments/submit', {
        method: 'POST',
        body: JSON.stringify({ code, attemptId }),
      }));
    }

    if (url.pathname === '/api/host/rename' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/rename', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
            name: sanitizeName(body?.name),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/adjust-score' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/adjust-score', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
            delta: Number(body?.delta || 0),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/grade-open' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/grade-open', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
            points: Number(body?.points || 0),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/poll/hide' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/poll/hide', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/open/hide' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/open/hide', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/open/feedback' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/open/feedback', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
            correction: String(body?.correction || '').slice(0, 280),
          }),
        }),
      );
    }

    if (url.pathname === '/api/host/open/model' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const token = readBearer(request);
      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!token) return json({ error: 'Host auth required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/host/open/model', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            playerId: sanitizeId(body?.playerId),
            modelAnswer: !!body?.modelAnswer,
          }),
        }),
      );
    }

    if (url.pathname === '/api/player/state' && request.method === 'GET') {
      const pin = sanitizePin(url.searchParams.get('pin'));
      const playerId = sanitizeId(url.searchParams.get('playerId'));
      const playerToken = request.headers.get('X-Player-Token') || '';

      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!playerId) return json({ error: 'playerId required.' }, 400);
      if (!playerToken) return json({ error: 'player token required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/player/state', {
          method: 'POST',
          body: JSON.stringify({ playerId, playerToken }),
        }),
      );
    }

    if (url.pathname === '/api/player/reroll-name' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const playerId = sanitizeId(body?.playerId);
      const playerToken = request.headers.get('X-Player-Token') || '';

      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!playerId) return json({ error: 'playerId required.' }, 400);
      if (!playerToken) return json({ error: 'player token required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/player/reroll-name', {
          method: 'POST',
          body: JSON.stringify({ playerId, playerToken }),
        }),
      );
    }

    if (url.pathname === '/api/answer' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const playerId = sanitizeId(body?.playerId);
      const playerToken = request.headers.get('X-Player-Token') || '';

      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!playerId) return json({ error: 'playerId required.' }, 400);
      if (!playerToken) return json({ error: 'player token required.' }, 401);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/answer', {
          method: 'POST',
          body: JSON.stringify({ playerId, playerToken, answer: body?.answer, bet: sanitizeBet(body?.bet) }),
        }),
      );
    }

    if (url.pathname === '/api/react' && request.method === 'POST') {
      const body = await safeJson(request);
      const pin = sanitizePin(body?.pin);
      const playerId = sanitizeId(body?.playerId);
      const playerToken = request.headers.get('X-Player-Token') || '';
      const emoji = sanitizeReaction(body?.emoji);

      if (!pin) return json({ error: 'PIN required.' }, 400);
      if (!playerId) return json({ error: 'playerId required.' }, 400);
      if (!playerToken) return json({ error: 'player token required.' }, 401);
      if (!emoji) return json({ error: 'Invalid reaction.' }, 400);

      const stub = env.ROOMS.get(env.ROOMS.idFromName(pin));
      return withCors(
        await stub.fetch('https://room/react', {
          method: 'POST',
          body: JSON.stringify({ playerId, playerToken, emoji }),
        }),
      );
    }

    if (url.pathname === '/api/tts/edge' && request.method === 'POST') {
      const body = await safeJson(request);
      const text = String(body?.text || '').trim();
      const voice = String(body?.voice || 'en-US-AriaNeural').trim();
      const rate = String(body?.rate || '+0%').trim();

      if (!text) return json({ error: 'Missing text.' }, 400);

      const edgeUrl = String(env.EDGE_TTS_URL || '').trim();
      if (!edgeUrl) return json({ error: 'Edge TTS is not configured on worker (EDGE_TTS_URL).' }, 501);

      try {
        const hash = await sha256Hex(`${voice}::${rate}::${text}`);
        const cacheUrl = new URL(request.url);
        cacheUrl.pathname = `/__edge_tts_cache/${hash}.mp3`;
        cacheUrl.search = '';

        const cache = caches.default;
        const cacheReq = new Request(cacheUrl.toString(), { method: 'GET' });
        const hit = await cache.match(cacheReq);
        if (hit) return withCors(hit);

        const headers = { 'Content-Type': 'application/json' };
        const secret = String(env.EDGE_TTS_SECRET || '').trim();
        if (secret) headers['Authorization'] = `Bearer ${secret}`;

        let ttsRes = await fetch(edgeUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text, voice, rate }),
        });

        // Convenience retry: if bridge base URL was provided without /tts.
        if (ttsRes.status === 404) {
          const retryUrl = edgeUrl.endsWith('/tts') ? edgeUrl : `${edgeUrl.replace(/\/+$/, '')}/tts`;
          if (retryUrl !== edgeUrl) {
            ttsRes = await fetch(retryUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ text, voice, rate }),
            });
          }
        }

        if (!ttsRes.ok) {
          const txt = await ttsRes.text();
          let err = txt;
          try { err = JSON.parse(txt)?.error || txt; } catch {}
          return json({ error: err || `Edge TTS failed (${ttsRes.status}).` }, 502);
        }

        const audio = await ttsRes.arrayBuffer();
        const out = new Response(audio, {
          status: 200,
          headers: {
            'Content-Type': ttsRes.headers.get('content-type') || 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        });
        await cache.put(cacheReq, out.clone());
        return withCors(out);
      } catch (err) {
        return json({ error: `Edge TTS request failed: ${err.message}` }, 502);
      }
    }

    if (url.pathname === '/api/drive/publish' && request.method === 'POST') {
      const body = await safeJson(request);
      const quiz = body?.quiz;

      if (!quiz?.questions?.length) return json({ error: 'Quiz must include at least one question.' }, 400);

      const scriptUrl = String(env.DRIVE_PUBLISH_URL || '').trim();
      if (!scriptUrl) {
        return json({ error: 'Drive publish is not configured on worker (DRIVE_PUBLISH_URL).' }, 501);
      }

      const outbound = {
        source: 'pinplay',
        secret: String(env.DRIVE_SHARED_SECRET || ''),
        quiz,
      };

      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outbound),
        });

        const text = await res.text();
        let data = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { raw: text };
          }
        }

        if (!res.ok) {
          return json({ error: data?.error || `Drive bridge failed (${res.status}).` }, 502);
        }

        return json(data, 200);
      } catch (err) {
        return json({ error: `Drive bridge request failed: ${err.message}` }, 502);
      }
    }

    if (url.pathname === '/api/drive/list' && request.method === 'GET') {
      const scriptUrl = String(env.DRIVE_PUBLISH_URL || '').trim();
      const secret = String(env.DRIVE_SHARED_SECRET || '');
      if (!scriptUrl) return json({ error: 'Drive publish is not configured on worker (DRIVE_PUBLISH_URL).' }, 501);

      try {
        const bridgeUrl = new URL(scriptUrl);
        bridgeUrl.searchParams.set('action', 'list');
        bridgeUrl.searchParams.set('secret', secret);

        const res = await fetch(bridgeUrl.toString(), { method: 'GET' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok || data?.error) return json({ error: data?.error || 'Drive list failed.' }, 502);
        return json(data, 200);
      } catch (err) {
        return json({ error: `Drive list request failed: ${err.message}` }, 502);
      }
    }

    if (url.pathname === '/api/drive/open' && request.method === 'GET') {
      const fileId = sanitizeId(url.searchParams.get('fileId'));
      if (!fileId) return json({ error: 'fileId required.' }, 400);

      const scriptUrl = String(env.DRIVE_PUBLISH_URL || '').trim();
      const secret = String(env.DRIVE_SHARED_SECRET || '');
      if (!scriptUrl) return json({ error: 'Drive publish is not configured on worker (DRIVE_PUBLISH_URL).' }, 501);

      try {
        const bridgeUrl = new URL(scriptUrl);
        bridgeUrl.searchParams.set('action', 'open');
        bridgeUrl.searchParams.set('secret', secret);
        bridgeUrl.searchParams.set('fileId', fileId);

        const res = await fetch(bridgeUrl.toString(), { method: 'GET' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok || data?.error) return json({ error: data?.error || 'Drive open failed.' }, 502);
        return json(data, 200);
      } catch (err) {
        return json({ error: `Drive open request failed: ${err.message}` }, 502);
      }
    }

    if (url.pathname === '/api/drive/delete' && request.method === 'POST') {
      const body = await safeJson(request);
      const fileId = sanitizeId(body?.fileId);
      if (!fileId) return json({ error: 'fileId required.' }, 400);

      const scriptUrl = String(env.DRIVE_PUBLISH_URL || '').trim();
      const secret = String(env.DRIVE_SHARED_SECRET || '');
      if (!scriptUrl) return json({ error: 'Drive publish is not configured on worker (DRIVE_PUBLISH_URL).' }, 501);

      try {
        const bridgeUrl = new URL(scriptUrl);
        bridgeUrl.searchParams.set('action', 'delete');
        bridgeUrl.searchParams.set('secret', secret);
        bridgeUrl.searchParams.set('fileId', fileId);

        const res = await fetch(bridgeUrl.toString(), { method: 'GET' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok || data?.error) return json({ error: data?.error || 'Drive delete failed.' }, 502);
        return json(data, 200);
      } catch (err) {
        return json({ error: `Drive delete request failed: ${err.message}` }, 502);
      }
    }

    if (url.pathname === '/api/images/search' && request.method === 'GET') {
      const query = String(url.searchParams.get('q') || '').trim();
      const count = clamp(Number(url.searchParams.get('count') || 10), 1, 100);
      if (!query) return json({ error: 'q required.' }, 400);

      const pexelsKey = String(env.PEXELS_API_KEY || '').trim();
      if (!pexelsKey) {
        return json({ error: 'Pexels image search is not configured (missing PEXELS_API_KEY).' }, 503);
      }

      const seen = new Set();
      const items = [];

      try {
        const perPage = 80;
        const pages = Math.max(1, Math.ceil(count / perPage));

        for (let page = 1; page <= pages; page += 1) {
          const remaining = count - items.length;
          if (remaining <= 0) break;

          const apiUrl = new URL('https://api.pexels.com/v1/search');
          apiUrl.searchParams.set('query', query);
          apiUrl.searchParams.set('per_page', String(Math.min(perPage, remaining)));
          apiUrl.searchParams.set('page', String(page));

          const res = await fetch(apiUrl.toString(), {
            method: 'GET',
            headers: {
              'Authorization': pexelsKey,
              'User-Agent': 'PinPlay/1.0 (+https://audiophrases.github.io/pinplay/) educational quiz app',
              'Accept': 'application/json,text/plain;q=0.9,*/*;q=0.8',
            },
          });
          const raw = await res.text();
          let data = {};
          try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
          if (!res.ok) {
            const msg = data?.error || data?.message || `Pexels failed (HTTP ${res.status}).`;
            throw new Error(msg);
          }

          const batch = (Array.isArray(data?.photos) ? data.photos : []).map((it) => ({
            url: String(it?.src?.large2x || it?.src?.large || it?.src?.medium || ''),
            thumb: String(it?.src?.tiny || it?.src?.small || it?.src?.medium || ''),
            title: String(it?.alt || `Photo by ${it?.photographer || 'Pexels'}`),
            source: 'Pexels',
          })).filter((it) => isHttpUrl(it.url));

          for (const it of batch) {
            if (!seen.has(it.url)) {
              seen.add(it.url);
              items.push(it);
              if (items.length >= count) break;
            }
          }
          if (items.length >= count || !batch.length) break;
        }

        return json({ provider: 'pexels', items }, 200);
      } catch (err) {
        return json({ error: `Pexels image search failed: ${err.message}` }, 502);
      }
    }

    if (url.pathname === '/api/images/fetch' && request.method === 'POST') {
      const body = await safeJson(request);
      const imageUrl = String(body?.url || '').trim();
      if (!isHttpUrl(imageUrl)) return json({ error: 'Valid image url required.' }, 400);

      try {
        const res = await fetch(imageUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'PinPlay/1.0 (+https://audiophrases.github.io/pinplay/) educational quiz app',
          },
        });
        if (!res.ok) return json({ error: 'Could not download image.' }, 502);
        const contentType = String(res.headers.get('content-type') || '').toLowerCase();
        if (!contentType.startsWith('image/')) return json({ error: 'URL is not an image.' }, 400);

        const bytes = await res.arrayBuffer();
        if (bytes.byteLength > 6 * 1024 * 1024) return json({ error: 'Image too large (max 6MB).' }, 400);

        const b64 = arrayBufferToBase64(bytes);
        return json({ dataUrl: `data:${contentType};base64,${b64}` }, 200);
      } catch (err) {
        return json({ error: `Image import failed: ${err.message}` }, 502);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};

export class QuizRoom {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (url.pathname === '/assignments/create' && request.method === 'POST') {
        const body = await safeJson(request);
        const quiz = normalizeQuiz(body?.quiz || {});
        if (!quiz.questions?.length) return json({ error: 'Quiz must include at least one valid question.' }, 400);

        const now = Date.now();
        const assignment = {
          id: randomId('as_'),
          code: await nextAssignmentCode(this.state.storage),
          createdAt: now,
          updatedAt: now,
          title: String(body?.title || quiz.title || 'Assignment').trim().slice(0, 120) || 'Assignment',
          className: sanitizeClassName(body?.className),
          attemptsLimit: clamp(Math.round(Number(body?.attemptsLimit ?? 1)), 0, 10),
          dueAt: Number(body?.dueAt || 0) > 0 ? Math.round(Number(body?.dueAt || 0)) : null,
          randomNames: !!body?.randomNames,
          feedbackMode: String(body?.feedbackMode || 'none'),
          active: true,
          quiz,
        };

        const assignments = await loadAssignmentsMap(this.state.storage);
        assignments[assignment.code] = assignment;
        await this.state.storage.put('assignments', assignments);

        return json({
          ok: true,
          assignment: publicAssignment(assignment, { includeQuiz: false }),
        }, 201);
      }

      if (url.pathname === '/assignments/list' && request.method === 'GET') {
        const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 50)));
        const assignments = await loadAssignmentsMap(this.state.storage);
        const list = Object.values(assignments || {})
          .sort((a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0))
          .slice(0, limit)
          .map((a) => publicAssignment(a, { includeQuiz: false }));
        return json({ ok: true, assignments: list });
      }

      if (url.pathname === '/assignments/get' && request.method === 'GET') {
        const code = sanitizeAssignmentCode(url.searchParams.get('code'));
        if (!code) return json({ error: 'Assignment code required.' }, 400);
        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);
        if (!assignment.active) return json({ error: 'Assignment is inactive.' }, 410);

        return json({ ok: true, assignment: publicAssignment(assignment, { includeQuiz: true }) });
      }

      if (url.pathname === '/assignments/start' && request.method === 'POST') {
        const body = await safeJson(request);
        const code = sanitizeAssignmentCode(body?.code);
        const studentKey = sanitizeAssignmentStudentKey(body?.studentKey);
        const studentName = sanitizeName(body?.studentName || body?.username || 'Student');
        if (!code) return json({ error: 'Assignment code required.' }, 400);
        if (!studentKey) return json({ error: 'Student key required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);
        if (!assignment.active) return json({ error: 'Assignment is inactive.' }, 410);

        const now = Date.now();
        if (Number(assignment.dueAt || 0) > 0 && now > Number(assignment.dueAt)) {
          return json({ error: 'Assignment due date has passed.' }, 410);
        }

        assignment.attempts = assignment.attempts && typeof assignment.attempts === 'object' ? assignment.attempts : {};
        const attempts = Object.values(assignment.attempts || {});

        const existingOpen = attempts.find((a) => String(a?.studentKey || '') === studentKey && !a?.submitted);
        if (existingOpen) {
          return json({ ok: true, alreadyStarted: true, attempt: publicAssignmentAttempt(assignment, existingOpen) });
        }

        const startedCount = attempts.filter((a) => String(a?.studentKey || '') === studentKey).length;
        const limit = clamp(Math.round(Number(assignment.attemptsLimit ?? 1)), 0, 10);
        if (limit > 0 && startedCount >= limit) {
          return json({ error: 'Attempts limit reached for this assignment.' }, 409);
        }

        const attempt = {
          id: randomId('at_'),
          studentKey,
          studentName,
          startedAt: now,
          updatedAt: now,
          submitted: false,
          submittedAt: null,
          answersByQ: {},
          autoScore: 0,
        };

        assignment.attempts[attempt.id] = attempt;
        assignment.updatedAt = now;
        assignments[code] = assignment;
        await this.state.storage.put('assignments', assignments);

        return json({ ok: true, alreadyStarted: false, attempt: publicAssignmentAttempt(assignment, attempt) }, 201);
      }

      if (url.pathname === '/assignments/results' && request.method === 'GET') {
        const code = sanitizeAssignmentCode(url.searchParams.get('code'));
        const studentKey = sanitizeAssignmentStudentKey(url.searchParams.get('studentKey'));
        if (!code) return json({ error: 'Assignment code required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);

        assignment.attempts = assignment.attempts && typeof assignment.attempts === 'object' ? assignment.attempts : {};
        let attempts = Object.values(assignment.attempts || {});
        
        // Filter by studentKey if provided (student-facing request)
        if (studentKey) {
          attempts = attempts.filter((a) => String(a?.studentKey || '') === studentKey);
        }
        
        attempts = attempts
          .map((a) => publicAssignmentAttemptSummary(assignment, a))
          .sort((a, b) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0));

        return json({
          ok: true,
          assignment: publicAssignment(assignment, { includeQuiz: false }),
          attempts,
        });
      }

      if (url.pathname === '/assignments/grade' && request.method === 'POST') {
        const body = await safeJson(request);
        const code = sanitizeAssignmentCode(body?.code);
        const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
        const qIndex = Math.round(Number(body?.qIndex));
        const pointsRaw = Number(body?.points);
        const correction = String(body?.correction || '').slice(0, 400);

        if (!code) return json({ error: 'Assignment code required.' }, 400);
        if (!attemptId) return json({ error: 'attemptId required.' }, 400);
        if (!Number.isFinite(qIndex)) return json({ error: 'qIndex required.' }, 400);
        if (!Number.isFinite(pointsRaw)) return json({ error: 'points required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);

        assignment.attempts = assignment.attempts && typeof assignment.attempts === 'object' ? assignment.attempts : {};
        const attempt = assignment.attempts?.[attemptId] || null;
        if (!attempt) return json({ error: 'Attempt not found.' }, 404);

        const question = assignment.quiz?.questions?.[qIndex];
        if (!question) return json({ error: 'Question not found.' }, 404);
        if (!isAssignmentTeacherGradedQuestion(question)) {
          return json({ error: 'Question is not teacher-graded.' }, 409);
        }

        const maxPoints = Math.max(0, Math.round(Number(question?.points || 1000)));
        const pointsAwarded = Math.max(0, Math.min(maxPoints, Math.round(pointsRaw)));

        attempt.answersByQ = attempt.answersByQ && typeof attempt.answersByQ === 'object' ? attempt.answersByQ : {};
        attempt.answersByQ[String(qIndex)] = {
          ...(attempt.answersByQ[String(qIndex)] || {}),
          teacherGrade: {
            graded: true,
            pointsAwarded,
            correction,
            gradedAt: Date.now(),
          },
          updatedAt: Date.now(),
        };

        attempt.updatedAt = Date.now();
        assignment.updatedAt = Date.now();
        assignments[code] = assignment;
        await this.state.storage.put('assignments', assignments);

        return json({ ok: true, attempt: publicAssignmentAttempt(assignment, attempt) });
      }

      if (url.pathname === '/assignments/state' && request.method === 'GET') {
        const code = sanitizeAssignmentCode(url.searchParams.get('code'));
        const attemptId = sanitizeAssignmentAttemptId(url.searchParams.get('attemptId'));
        if (!code) return json({ error: 'Assignment code required.' }, 400);
        if (!attemptId) return json({ error: 'attemptId required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);

        assignment.attempts = assignment.attempts && typeof assignment.attempts === 'object' ? assignment.attempts : {};
        const attempt = assignment.attempts?.[attemptId] || null;
        if (!attempt) return json({ error: 'Attempt not found.' }, 404);

        const includeAnswers = assignment.feedbackMode !== 'none' && !!attempt.submitted && !assignment.quiz?.questions?.some((q) => isAssignmentTeacherGradedQuestion(q));
        return json({ ok: true, attempt: publicAssignmentAttempt(assignment, attempt, { includeAnswers }) });
      }

      if (url.pathname === '/assignments/attempt' && request.method === 'GET') {
        const code = sanitizeAssignmentCode(url.searchParams.get('code'));
        const attemptId = sanitizeAssignmentAttemptId(url.searchParams.get('attemptId'));
        if (!code) return json({ error: 'Assignment code required.' }, 400);
        if (!attemptId) return json({ error: 'attemptId required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);

        assignment.attempts = assignment.attempts && typeof assignment.attempts === 'object' ? assignment.attempts : {};
        const attempt = assignment.attempts?.[attemptId] || null;
        if (!attempt) return json({ error: 'Attempt not found.' }, 404);

        return json({
          ok: true,
          assignment: publicAssignment(assignment, { includeQuiz: false }),
          attempt: publicAssignmentAttemptSummary(assignment, attempt),
          gradingItems: buildTeacherGradingItems(assignment, attempt),
        });
      }

      if (url.pathname === '/assignments/answer' && request.method === 'POST') {
        const body = await safeJson(request);
        const code = sanitizeAssignmentCode(body?.code);
        const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
        const qIndex = Math.round(Number(body?.qIndex));
        if (!code) return json({ error: 'Assignment code required.' }, 400);
        if (!attemptId) return json({ error: 'attemptId required.' }, 400);
        if (!Number.isFinite(qIndex)) return json({ error: 'qIndex required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);
        if (!assignment.active) return json({ error: 'Assignment is inactive.' }, 410);

        const now = Date.now();
        if (Number(assignment.dueAt || 0) > 0 && now > Number(assignment.dueAt)) {
          return json({ error: 'Assignment due date has passed.' }, 410);
        }

        assignment.attempts = assignment.attempts && typeof assignment.attempts === 'object' ? assignment.attempts : {};
        const attempt = assignment.attempts?.[attemptId] || null;
        if (!attempt) return json({ error: 'Attempt not found.' }, 404);
        if (attempt.submitted) return json({ error: 'Attempt already submitted.' }, 409);

        const question = assignment.quiz?.questions?.[qIndex];
        if (!question) return json({ error: 'Question not found.' }, 404);

        const safeAnswer = sanitizeAssignmentAnswer(question, body?.answer);
        attempt.answersByQ = attempt.answersByQ && typeof attempt.answersByQ === 'object' ? attempt.answersByQ : {};
        attempt.answersByQ[String(qIndex)] = {
          ...(attempt.answersByQ[String(qIndex)] || {}),
          answer: safeAnswer,
          teacherGrade: isAssignmentTeacherGradedQuestion(question) ? null : (attempt.answersByQ[String(qIndex)]?.teacherGrade || null),
          updatedAt: now,
        };

        const metrics = evaluateAssignmentAttempt(assignment, attempt);
        attempt.autoScore = metrics.autoScore;
        attempt.updatedAt = now;

        assignment.updatedAt = now;
        assignments[code] = assignment;
        await this.state.storage.put('assignments', assignments);

        const includeAnswers = assignment.feedbackMode !== 'none' && !!attempt.submitted && !assignment.quiz?.questions?.some((q) => isAssignmentTeacherGradedQuestion(q));
        return json({
          ok: true,
          saved: true,
          qIndex,
          metrics,
          attempt: publicAssignmentAttempt(assignment, attempt, { includeAnswers }),
        });
      }

      if (url.pathname === '/assignments/submit' && request.method === 'POST') {
        const body = await safeJson(request);
        const code = sanitizeAssignmentCode(body?.code);
        const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
        if (!code) return json({ error: 'Assignment code required.' }, 400);
        if (!attemptId) return json({ error: 'attemptId required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);
        if (!assignment.active) return json({ error: 'Assignment is inactive.' }, 410);
        if (Number(assignment.dueAt || 0) > 0 && Date.now() > Number(assignment.dueAt)) {
          return json({ error: 'Assignment due date has passed.' }, 410);
        }

        assignment.attempts = assignment.attempts && typeof assignment.attempts === 'object' ? assignment.attempts : {};
        const attempt = assignment.attempts?.[attemptId] || null;
        if (!attempt) return json({ error: 'Attempt not found.' }, 404);
        if (attempt.submitted) return json({ ok: true, alreadySubmitted: true, attempt: publicAssignmentAttempt(assignment, attempt) });

        const metrics = evaluateAssignmentAttempt(assignment, attempt);
        if (Number(metrics.answeredCount || 0) <= 0) {
          return json({ error: 'Answer at least one question before submitting.' }, 409);
        }

        attempt.submitted = true;
        attempt.submittedAt = Date.now();
        attempt.updatedAt = attempt.submittedAt;
        assignment.updatedAt = attempt.submittedAt;

        assignments[code] = assignment;
        await this.state.storage.put('assignments', assignments);

        const includeAnswers = assignment.feedbackMode !== 'none' && !!attempt.submitted && !assignment.quiz?.questions?.some((q) => isAssignmentTeacherGradedQuestion(q));
        return json({ ok: true, alreadySubmitted: false, attempt: publicAssignmentAttempt(assignment, attempt, { includeAnswers }) });
      }

      if (url.pathname === '/assignments/reopen-attempt' && request.method === 'POST') {
        const body = await safeJson(request);
        const code = sanitizeAssignmentCode(body?.code);
        const attemptId = sanitizeAssignmentAttemptId(body?.attemptId);
        if (!code) return json({ error: 'Assignment code required.' }, 400);
        if (!attemptId) return json({ error: 'attemptId required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);

        assignment.attempts = assignment.attempts && typeof assignment.attempts === 'object' ? assignment.attempts : {};
        const attempt = assignment.attempts?.[attemptId] || null;
        if (!attempt) return json({ error: 'Attempt not found.' }, 404);

        attempt.submitted = false;
        attempt.submittedAt = null;
        attempt.updatedAt = Date.now();
        assignment.updatedAt = attempt.updatedAt;

        assignments[code] = assignment;
        await this.state.storage.put('assignments', assignments);

        return json({ ok: true, attempt: publicAssignmentAttempt(assignment, attempt) });
      }

      if (url.pathname === '/assignments/toggle-active' && request.method === 'POST') {
        const body = await safeJson(request);
        const code = sanitizeAssignmentCode(body?.code);
        if (!code) return json({ error: 'Assignment code required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);

        assignment.active = !!body?.active;
        assignment.updatedAt = Date.now();
        assignments[code] = assignment;
        await this.state.storage.put('assignments', assignments);

        return json({ ok: true, assignment: publicAssignment(assignment, { includeQuiz: false }) });
      }

      if (url.pathname === '/assignments/delete' && request.method === 'POST') {
        const body = await safeJson(request);
        const code = sanitizeAssignmentCode(body?.code);
        if (!code) return json({ error: 'Assignment code required.' }, 400);

        const assignments = await loadAssignmentsMap(this.state.storage);
        const assignment = assignments?.[code] || null;
        if (!assignment) return json({ error: 'Assignment not found.' }, 404);

        delete assignments[code];
        await this.state.storage.put('assignments', assignments);

        return json({ ok: true, deleted: code });
      }

      if (url.pathname === '/init' && request.method === 'POST') {
        const body = await safeJson(request);
        const pin = sanitizePin(body?.pin);
        const quiz = body?.quiz;
        const options = body?.options || {};

        if (!pin || !quiz?.questions?.length) {
          return json({ error: 'Invalid init payload.' }, 400);
        }

        const current = await this.#getRoom();
        if (current && Date.now() - current.updatedAt < ROOM_TTL_MS) {
          return json({ error: 'PIN already in use.' }, 409);
        }

        const room = {
          pin,
          hostToken: randomToken(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          phase: 'lobby',
          currentIndex: -1,
          questionStartedAt: null,
          questionClosed: false,
          questionClosedAt: null,
          questionCloseReason: null,
          quiz: normalizeQuiz(quiz),
          players: {},
          responsesByQuestion: {},
          scoreLocksByQuestion: {},
          reactionsByQuestion: {},
          eventLog: [],
          settings: {
            randomNames: !!options.randomNames,
          },
        };

        appendRoomEvent(room, 'room_created', {
          pin: room.pin,
          randomNames: !!room.settings?.randomNames,
          quizTitle: String(room.quiz?.title || '').slice(0, 120),
          quizQuestions: Number(room.quiz?.questions?.length || 0),
        });

        await this.#setRoom(room);
        return json({ pin, hostToken: room.hostToken, settings: room.settings }, 201);
      }

      const room = await this.#getRoom();
      if (!room) return json({ error: 'Room not found.' }, 404);

      if (Date.now() - room.updatedAt > ROOM_TTL_MS) {
        await this.state.storage.delete('room');
        return json({ error: 'Room expired.' }, 410);
      }

      if (!Array.isArray(room.eventLog)) room.eventLog = [];

      if (url.pathname === '/pin/check' && request.method === 'GET') {
        const clientId = sanitizeId(url.searchParams.get('clientId'));
        const existing = findPlayerByClientId(room, clientId);
        return json({
          ok: true,
          pin: room.pin,
          phase: room.phase,
          settings: {
            randomNames: !!room.settings?.randomNames,
          },
          alreadyJoined: !!existing,
          joinedPlayer: existing
            ? {
                id: existing.id,
                name: existing.name,
                identity: existing.identity || null,
              }
            : null,
        });
      }

      if (url.pathname === '/join' && request.method === 'POST') {
        const body = await safeJson(request);
        const rawName = sanitizeName(body?.name);
        const password = String(body?.password || '').slice(0, 120);
        const clientId = sanitizeId(body?.clientId);

        if (clientId) {
          const existing = findPlayerByClientId(room, clientId);
          if (existing) {
            return json({
              playerId: existing.id,
              playerToken: existing.token,
              pin: room.pin,
              name: existing.name,
              identity: existing.identity || null,
              alreadyJoined: true,
            });
          }
        }

        let name = rawName;
        let verifiedIdentity = null;
        if (room.settings?.randomNames) {
          name = pickRandomName(room.players);
        }

        if (!name) return json({ error: 'Name is required.' }, 400);
        if (hasBlockedNickname(name)) {
          return json({ error: 'Nickname not allowed. Please choose another one.' }, 400);
        }

        if (!room.settings?.randomNames) {
          if (!password) return json({ error: 'Username and password are required.' }, 401);

          const verifyUrl = String(request.headers.get('X-Login-Verify-Url') || '').trim();
          const verifySecret = String(request.headers.get('X-Login-Verify-Secret') || '').trim();
          if (!verifyUrl) return json({ error: 'Login verification is not configured.' }, 501);

          try {
            const verifyHeaders = { 'Content-Type': 'application/json' };
            if (verifySecret) verifyHeaders['Authorization'] = `Bearer ${verifySecret}`;

            const verifyNames = [name];
            const lowerName = sanitizeName(name).toLowerCase();
            if (lowerName && !verifyNames.includes(lowerName)) {
              verifyNames.push(lowerName);
            }

            let vData = null;
            let verifiedWithName = name;
            let verified = false;

            for (const candidateName of verifyNames) {
              const vRes = await fetch(verifyUrl, {
                method: 'POST',
                headers: verifyHeaders,
                body: JSON.stringify({ username: candidateName, password, pin: room.pin, secret: verifySecret }),
              });
              const vTxt = await vRes.text();
              let parsed = {};
              try { parsed = vTxt ? JSON.parse(vTxt) : {}; } catch {}

              if (!vRes.ok) continue;
              if (parsed && parsed.ok === false) continue;

              vData = parsed;
              verifiedWithName = candidateName;
              verified = true;
              break;
            }

            if (!verified) return json({ error: 'Invalid username or password.' }, 401);

            verifiedIdentity = await normalizeStudentIdentity(vData || {}, verifiedWithName);
            const preferredDisplay = sanitizeName(
              verifiedIdentity?.displayName
              || (vData && (vData.displayName || vData.display_name))
              || name,
            ) || name;
            name = preferredDisplay;
          } catch {
            return json({ error: 'Login verification service unavailable.' }, 502);
          }

          const nameTaken = Object.values(room.players || {}).some((p) => normalizeNameKey(p.name) === normalizeNameKey(name));
          if (nameTaken) return json({ error: 'Name already in use in this game.' }, 409);

          if (verifiedIdentity?.studentKey) {
            const sameStudentAlreadyIn = Object.values(room.players || {}).some((p) => String(p?.identity?.studentKey || '') === verifiedIdentity.studentKey);
            if (sameStudentAlreadyIn) return json({ error: 'Student already joined in this game.' }, 409);
          }
        }

        const playerId = randomId('p_');
        const playerToken = randomToken();

        room.players[playerId] = {
          id: playerId,
          name,
          token: playerToken,
          clientId: clientId || '',
          score: 0,
          joinedAt: Date.now(),
          identity: verifiedIdentity || {
            username: sanitizeName(name),
            displayName: sanitizeName(name),
            className: '',
            email: '',
            studentKey: '',
            source: room.settings?.randomNames ? 'random' : 'manual',
          },
        };

        appendRoomEvent(room, 'player_joined', {
          playerId,
          name,
          identity: room.players[playerId].identity || null,
          via: room.settings?.randomNames ? 'random-names' : 'login',
        });

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({
          playerId,
          playerToken,
          pin: room.pin,
          name,
          identity: room.players[playerId].identity || null,
          alreadyJoined: false,
        });
      }

      if (url.pathname === '/host/state' && request.method === 'GET') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const timeoutClosed = closeQuestionIfTimedOut(room);
        if (timeoutClosed) await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/host/events' && request.method === 'GET') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 120)));
        const list = Array.isArray(room.eventLog) ? room.eventLog : [];
        return json({
          pin: room.pin,
          events: list.slice(Math.max(0, list.length - limit)),
        });
      }

      if (url.pathname === '/host/attempts' && request.method === 'GET') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        return json(buildAttemptSnapshots(room));
      }

      if (url.pathname === '/host/join' && request.method === 'POST') {
        return json({ ok: true, pin: room.pin, hostToken: room.hostToken, phase: room.phase });
      }

      if (url.pathname === '/host/start' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        if (room.phase === 'lobby' && room.quiz.questions.length > 0) {
          startQuestion(room, 0);
          await this.#setRoom(room);
        }

        return json(hostState(room));
      }

      if (url.pathname === '/host/quiz/update' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const nextQuiz = normalizeQuiz(body?.quiz || {});
        if (!nextQuiz.questions?.length) return json({ error: 'Quiz must include at least one valid question.' }, 400);

        if (room.phase === 'question' && room.currentIndex >= nextQuiz.questions.length) {
          return json({ error: 'Updated quiz is shorter than current live index.' }, 409);
        }

        room.quiz = nextQuiz;
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/host/next' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        closeQuestionIfTimedOut(room);

        if (room.phase === 'lobby') {
          if (room.quiz.questions.length > 0) startQuestion(room, 0);
        } else if (room.phase === 'question') {
          if (room.currentIndex + 1 < room.quiz.questions.length) {
            startQuestion(room, room.currentIndex + 1);
          } else {
            room.phase = 'results';
            room.questionStartedAt = null;
            room.questionClosed = true;
            room.questionClosedAt = Date.now();
            room.questionCloseReason = 'finished';
            appendRoomEvent(room, 'game_finished', {
              totalQuestions: Number(room.quiz?.questions?.length || 0),
              finishedAt: room.questionClosedAt,
            });
            room.updatedAt = Date.now();
          }
        }

        await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/host/prev' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        closeQuestionIfTimedOut(room);

        if (room.phase === 'results') {
          if (room.quiz.questions.length > 0) startQuestion(room, room.quiz.questions.length - 1);
        } else if (room.phase === 'question' && room.currentIndex > 0) {
          startQuestion(room, room.currentIndex - 1);
        }

        await this.#setRoom(room);
        return json(hostState(room));
      }

      if (url.pathname === '/host/reveal' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        if (room.phase === 'question') {
          closeCurrentQuestion(room, 'manual_reveal');
          await this.#setRoom(room);
        }

        return json(hostState(room));
      }

      if (url.pathname === '/host/settings' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        room.settings = {
          ...(room.settings || {}),
          randomNames: !!body?.randomNames,
        };
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json(hostState(room));
      }

      if (url.pathname === '/host/kick' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);

        const removed = room.players[playerId] || null;
        delete room.players[playerId];

        Object.keys(room.responsesByQuestion || {}).forEach((qIdx) => {
          if (room.responsesByQuestion[qIdx]?.[playerId]) {
            delete room.responsesByQuestion[qIdx][playerId];
          }
        });

        appendRoomEvent(room, 'player_removed', {
          playerId,
          name: removed?.name || '',
          identity: removed?.identity || null,
          actor: 'host',
        });

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId });
      }

      if (url.pathname === '/host/rename' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const nextName = sanitizeName(body?.name);

        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);
        if (!nextName) return json({ error: 'Name is required.' }, 400);
        if (hasBlockedNickname(nextName)) return json({ error: 'Name is not allowed.' }, 400);

        const nameTaken = Object.values(room.players || {}).some((p) => p.id !== playerId && normalizeNameKey(p.name) === normalizeNameKey(nextName));
        if (nameTaken) return json({ error: 'Name already in use.' }, 409);

        const prevName = room.players[playerId].name;
        room.players[playerId].name = nextName;
        room.players[playerId].identity = room.players[playerId].identity && typeof room.players[playerId].identity === 'object'
          ? room.players[playerId].identity
          : { username: sanitizeName(nextName), displayName: sanitizeName(nextName), className: '', email: '', studentKey: '', source: 'manual' };
        room.players[playerId].identity.displayName = nextName;

        appendRoomEvent(room, 'player_renamed', {
          playerId,
          previousName: prevName,
          nextName,
          identity: room.players[playerId].identity || null,
          actor: 'host',
        });

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, name: nextName });
      }

      if (url.pathname === '/host/adjust-score' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const delta = Number(body?.delta || 0);

        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);
        if (!Number.isFinite(delta) || delta === 0) return json({ error: 'delta must be a non-zero number.' }, 400);

        room.players[playerId].score = Math.max(0, Number(room.players[playerId].score || 0) + Math.round(delta));
        appendRoomEvent(room, 'score_adjusted', {
          playerId,
          name: room.players[playerId]?.name || '',
          identity: room.players[playerId]?.identity || null,
          delta: Math.round(delta),
          scoreAfter: Number(room.players[playerId]?.score || 0),
          actor: 'host',
        });
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, score: room.players[playerId].score, delta: Math.round(delta) });
      }

      if (url.pathname === '/host/grade-open' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const pointsRaw = Number(body?.points);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);
        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question || !(question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || isTeacherGradedTextQuestion(question))) return json({ error: 'Current question is not teacher-graded.' }, 409);

        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);
        const resp = room.responsesByQuestion?.[qIndex]?.[playerId];
        if (!resp) return json({ error: 'No submitted open answer for this player.' }, 404);

        const maxPoints = Number(question.points || 1000);
        const rawPoints = Math.round(clamp(pointsRaw, 0, maxPoints));
        const isCorrect = rawPoints > 0;
        const adjustedPoints = applyBetScore(maxPoints, rawPoints, isCorrect, sanitizeBet(resp?.bet));

        const prev = Number(resp.pointsAwarded || 0);
        resp.rawPoints = rawPoints;
        resp.pointsAwarded = adjustedPoints;
        resp.correct = isCorrect;
        resp.graded = true;
        resp.gradedAt = Date.now();
        if (typeof resp.modelAnswer !== 'boolean') resp.modelAnswer = false;
        if (typeof resp.correction !== 'string') resp.correction = '';

        room.players[playerId].score = Math.max(0, Number(room.players[playerId].score || 0) - prev + adjustedPoints);
        appendRoomEvent(room, 'answer_graded', {
          playerId,
          name: room.players[playerId]?.name || '',
          identity: room.players[playerId]?.identity || null,
          qIndex,
          qType: String(question?.type || ''),
          rawPoints,
          pointsAwarded: Number(adjustedPoints || 0),
          scoreAfter: Number(room.players[playerId]?.score || 0),
          actor: 'host',
        });
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, pointsAwarded: adjustedPoints, score: room.players[playerId].score });
      }

      if (url.pathname === '/host/poll/hide' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);
        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question || !question.isPoll) return json({ error: 'Current question is not a poll.' }, 409);
        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);

        const resp = room.responsesByQuestion?.[qIndex]?.[playerId];
        if (!resp) return json({ error: 'No submitted answer for this player.' }, 404);

        resp.hidden = true;
        resp.hiddenAt = Date.now();
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, hidden: true });
      }

      if (url.pathname === '/host/open/hide' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);
        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question || !(question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || isTeacherGradedTextQuestion(question))) {
          return json({ error: 'Current question is not teacher-graded.' }, 409);
        }
        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);

        const resp = room.responsesByQuestion?.[qIndex]?.[playerId];
        if (!resp) return json({ error: 'No submitted answer for this player.' }, 404);

        resp.hidden = true;
        resp.hiddenAt = Date.now();
        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, playerId, hidden: true });
      }

      if (url.pathname === '/host/open/feedback' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const correction = String(body?.correction || '').slice(0, 280);

        if (!(room.phase === 'question' || room.phase === 'results')) return json({ error: 'Question is not active.' }, 409);
        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question || !(question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || isTeacherGradedTextQuestion(question))) {
          return json({ error: 'Current question is not teacher-graded.' }, 409);
        }
        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);

        const resp = room.responsesByQuestion?.[qIndex]?.[playerId];
        if (!resp) return json({ error: 'No submitted answer for this player.' }, 404);

        resp.correction = correction;
        resp.feedbackAt = Date.now();
        room.updatedAt = Date.now();
        await this.#setRoom(room);
        return json({ ok: true, playerId, correction });
      }

      if (url.pathname === '/host/open/model' && request.method === 'POST') {
        const token = readBearer(request);
        if (token !== room.hostToken) return json({ error: 'Unauthorized host.' }, 401);

        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const modelAnswer = !!body?.modelAnswer;

        if (!(room.phase === 'question' || room.phase === 'results')) return json({ error: 'Question is not active.' }, 409);
        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question || !(question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || isTeacherGradedTextQuestion(question))) {
          return json({ error: 'Current question is not teacher-graded.' }, 409);
        }
        if (!playerId || !room.players[playerId]) return json({ error: 'Player not found.' }, 404);

        const resp = room.responsesByQuestion?.[qIndex]?.[playerId];
        if (!resp) return json({ error: 'No submitted answer for this player.' }, 404);

        resp.modelAnswer = modelAnswer;
        if (modelAnswer) resp.hidden = false;
        resp.modelAt = Date.now();
        room.updatedAt = Date.now();
        await this.#setRoom(room);
        return json({ ok: true, playerId, modelAnswer });
      }

      if (url.pathname === '/player/state' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);

        const timeoutClosed = closeQuestionIfTimedOut(room);
        if (timeoutClosed) await this.#setRoom(room);

        return json(playerState(room, playerId));
      }

      if (url.pathname === '/player/reroll-name' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);
        if (!room.settings?.randomNames) return json({ error: 'Random names mode is disabled.' }, 409);
        if (room.phase !== 'lobby') return json({ error: 'Name can only be changed before game start.' }, 409);

        const nextName = pickRandomName(room.players);
        player.name = nextName;
        player.identity = player.identity || {};
        player.identity.username = sanitizeName(nextName);
        player.identity.displayName = sanitizeName(nextName);
        player.identity.source = 'random';

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, name: nextName });
      }

      if (url.pathname === '/answer' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');
        const bet = sanitizeBet(body?.bet);

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);

        const timeoutClosed = closeQuestionIfTimedOut(room);
        if (timeoutClosed) await this.#setRoom(room);

        if (room.phase !== 'question') return json({ error: 'Question is not active.' }, 409);
        if (room.questionClosed) return json({ error: 'Question is closed.' }, 409);

        const qIndex = room.currentIndex;
        const question = room.quiz.questions[qIndex];
        if (!question) return json({ error: 'Question not found.' }, 404);

        room.responsesByQuestion[qIndex] = room.responsesByQuestion[qIndex] || {};

        if (room.responsesByQuestion[qIndex][playerId]) {
          const existing = room.responsesByQuestion[qIndex][playerId];
          return json({
            ok: true,
            alreadyAnswered: true,
            correct: existing.correct,
            pointsAwarded: existing.pointsAwarded,
            score: room.players[playerId].score,
            currentIndex: qIndex,
          });
        }

        let verdict = { correct: false };
        let pointsAwarded = 0;

        if (question.isPoll) {
          room.responsesByQuestion[qIndex][playerId] = {
            answer: body?.answer,
            correct: false,
            bet: 0,
            pointsAwarded: 0,
            graded: true,
            hidden: false,
            submittedAt: Date.now(),
          };
        } else if (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || isTeacherGradedTextQuestion(question)) {
          room.responsesByQuestion[qIndex][playerId] = {
            answer: String(body?.answer || '').slice(0, 220),
            correct: false,
            bet,
            pointsAwarded: 0,
            graded: false,
            correction: '',
            modelAnswer: false,
            submittedAt: Date.now(),
          };
        } else {
          room.scoreLocksByQuestion = room.scoreLocksByQuestion || {};
          room.scoreLocksByQuestion[qIndex] = room.scoreLocksByQuestion[qIndex] || {};
          const lock = room.scoreLocksByQuestion[qIndex][playerId] || { lockedCorrect: false };

          verdict = evaluate(question, body?.answer);
          const basePoints = Number(question.points || 1000);

          if (!lock.lockedCorrect && verdict.correct) {
            const correctCountSoFar = Object.values(room.responsesByQuestion[qIndex] || {})
              .filter((r) => !!r?.correct)
              .length;
            const rank = correctCountSoFar + 1;
            const multiplier = rank <= 2 ? 1 : (rank <= 4 ? 0.9 : 0.8);
            pointsAwarded = Math.round(basePoints * multiplier);
            pointsAwarded = applyBetScore(basePoints, pointsAwarded, true, bet);

            lock.lockedCorrect = true;
            lock.awardedPoints = pointsAwarded;
            lock.awardedAt = Date.now();
            room.scoreLocksByQuestion[qIndex][playerId] = lock;
          } else {
            pointsAwarded = 0;
          }

          room.responsesByQuestion[qIndex][playerId] = {
            answer: body?.answer,
            correct: verdict.correct,
            bet,
            pointsAwarded,
            graded: true,
            submittedAt: Date.now(),
          };
        }

        room.players[playerId].score = Math.max(0, Number(room.players[playerId].score || 0) + Math.round(pointsAwarded));

        appendRoomEvent(room, 'answer_submitted', {
          playerId,
          name: room.players[playerId]?.name || '',
          identity: room.players[playerId]?.identity || null,
          qIndex,
          qType: String(question?.type || ''),
          isPoll: !!question?.isPoll,
          correct: !!verdict.correct,
          graded: !!room.responsesByQuestion[qIndex]?.[playerId]?.graded,
          pointsAwarded: Number(pointsAwarded || 0),
          scoreAfter: Number(room.players[playerId]?.score || 0),
          bet,
          submittedAt: Number(room.responsesByQuestion[qIndex]?.[playerId]?.submittedAt || Date.now()),
        });

        const totalPlayers = Object.keys(room.players || {}).length;
        const answeredCount = Object.keys(room.responsesByQuestion[qIndex] || {}).length;
        const qRef = room.quiz.questions[qIndex];
        const teacherGradedFlow = !!(qRef && (qRef.type === 'open' || qRef.type === 'image_open' || qRef.type === 'speaking' || isTeacherGradedTextQuestion(qRef)));
        if (totalPlayers > 0 && answeredCount >= totalPlayers && !teacherGradedFlow) {
          closeCurrentQuestion(room, 'all_answered');
        } else {
          room.updatedAt = Date.now();
        }

        await this.#setRoom(room);

        return json({
          ok: true,
          alreadyAnswered: false,
          correct: verdict.correct,
          pointsAwarded,
          score: room.players[playerId].score,
          currentIndex: qIndex,
        });
      }

      if (url.pathname === '/react' && request.method === 'POST') {
        const body = await safeJson(request);
        const playerId = sanitizeId(body?.playerId);
        const playerToken = String(body?.playerToken || '');
        const emoji = sanitizeReaction(body?.emoji);

        const player = room.players[playerId];
        if (!player || player.token !== playerToken) return json({ error: 'Unauthorized player.' }, 401);
        if (!emoji) return json({ error: 'Invalid reaction.' }, 400);

        const timeoutClosed = closeQuestionIfTimedOut(room);
        if (timeoutClosed) await this.#setRoom(room);

        if (!(room.phase === 'question' || room.phase === 'results')) {
          return json({ error: 'Question is not active.' }, 409);
        }

        const qIndex = effectiveQuestionIndex(room);
        room.reactionsByQuestion = room.reactionsByQuestion || {};
        room.reactionsByQuestion[qIndex] = room.reactionsByQuestion[qIndex] || [];

        const list = room.reactionsByQuestion[qIndex];
        const payload = {
          playerId,
          name: player.name,
          emoji,
          at: Date.now(),
        };

        list.push(payload);
        if (list.length > 120) list.splice(0, list.length - 120);

        room.updatedAt = Date.now();
        await this.#setRoom(room);

        return json({ ok: true, reaction: payload });
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: err?.message || 'Unexpected error' }, 500);
    }
  }

  async #getRoom() {
    return (await this.state.storage.get('room')) || null;
  }

  async #setRoom(room) {
    await this.state.storage.put('room', room);
  }
}

function summarizeHistoryAnswer(question, answer) {
  if (!question) return '(no answer)';
  if (['mcq', 'tf', 'audio'].includes(question.type)) {
    const idx = Number(answer);
    return Number.isFinite(idx) ? String(question.answers?.[idx]?.text || `Option ${idx + 1}`) : '(blank)';
  }
  if (question.type === 'multi') {
    const arr = Array.isArray(answer) ? answer : [];
    return arr.map((idx) => String(question.answers?.[Number(idx)]?.text || '')).filter(Boolean).join(' + ') || '(none)';
  }
  if (question.type === 'pin') {
    const picks = Array.isArray(answer) ? answer : (answer ? [answer] : []);
    return picks.map((p) => `(${Math.round(Number(p?.x || 0))}%, ${Math.round(Number(p?.y || 0))}%)`).join(' | ') || '(none)';
  }
  if (question.type === 'speaking') return '__spoken__' === String(answer || '') ? '🗣️ Spoke (teacher grades)' : String(answer || '');
  if (question.type === 'error_hunt') return String(answer?.rewrite || '');
  if (question.type === 'context_gap' || question.type === 'match_pairs' || question.type === 'puzzle') {
    return Array.isArray(answer) ? answer.join(' | ') : String(answer || '');
  }
  return String(answer || '');
}

function effectiveQuestionIndex(room) {
  const total = Number(room?.quiz?.questions?.length || 0);
  if (total <= 0) return -1;
  const idx = Number(room?.currentIndex);
  if (Number.isInteger(idx) && idx >= 0 && idx < total) return idx;
  return total - 1;
}

function hostState(room) {
  const qIndex = effectiveQuestionIndex(room);
  const responses = room.responsesByQuestion[qIndex] || {};
  const startedAt = Number(room.questionStartedAt || 0);
  const reactions = (room.reactionsByQuestion?.[qIndex] || []).filter((r) => Number(r?.at || 0) >= startedAt);
  const players = Object.values(room.players)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      answeredCurrent: !!responses[p.id],
      identity: p.identity || null,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const roomQuestion = room.quiz.questions[qIndex] || null;
  const question = (room.phase === 'question' || room.phase === 'results') ? hostQuestionPayload(roomQuestion) : null;
  const timeLimitSec = getQuestionTimeLimitSec(roomQuestion);

  const pollVisible = room.phase === 'question' && !!room.questionClosed && !!roomQuestion?.isPoll;
  const pollResponses = pollVisible
    ? Object.entries(responses).map(([pid, r]) => ({
        playerId: pid,
        name: room.players?.[pid]?.name || 'Student',
        answer: r?.answer,
        hidden: !!r?.hidden,
      }))
    : [];

  const totalQs = Number(room.quiz?.questions?.length || 0);
  const answerHistory = [];
  for (let i = Math.max(0, totalQs - 8); i < totalQs; i++) {
    const questionRef = room.quiz?.questions?.[i];
    if (!questionRef) continue;
    const perQ = room.responsesByQuestion?.[i] || {};
    const entries = Object.entries(perQ).map(([pid, r]) => ({
      playerId: pid,
      name: room.players?.[pid]?.name || 'Student',
      answerText: summarizeHistoryAnswer(questionRef, r?.answer),
      correct: !!r?.correct,
      graded: !!r?.graded,
      pointsAwarded: Number(r?.pointsAwarded || 0),
      hidden: !!r?.hidden,
      correction: String(r?.correction || ''),
      modelAnswer: !!r?.modelAnswer,
      submittedAt: Number(r?.submittedAt || 0) || null,
    })).sort((a, b) => String(a.name).localeCompare(String(b.name)));

    if (entries.length || i === qIndex) {
      answerHistory.push({
        qIndex: i,
        prompt: String(questionRef.prompt || ''),
        type: String(questionRef.type || ''),
        entries,
      });
    }
  }

  return {
    phase: room.phase,
    pin: room.pin,
    currentIndex: qIndex,
    totalQuestions: room.quiz.questions.length,
    playerCount: players.length,
    responseCount: Object.keys(responses).length,
    reactions,
    players,
    question,
    questionStartedAt: room.questionStartedAt || null,
    questionClosed: !!room.questionClosed,
    questionClosedAt: room.questionClosedAt || null,
    questionCloseReason: room.questionCloseReason || null,
    questionDeadlineAt:
      room.phase === 'question' && room.questionStartedAt && Number.isFinite(timeLimitSec)
        ? Number(room.questionStartedAt) + timeLimitSec * 1000
        : null,
    serverNow: Date.now(),
    allAnswered: room.phase === 'question' && players.length > 0 && Object.keys(responses).length >= players.length,
    openResponses: !roomQuestion?.isPoll && (['open', 'image_open', 'speaking'].includes(roomQuestion?.type) || isTeacherGradedTextQuestion(roomQuestion))
      ? Object.entries(responses)
        .filter(([, r]) => !r?.hidden)
        .map(([pid, r]) => ({
          playerId: pid,
          name: room.players?.[pid]?.name || 'Student',
          answer: String(r?.answer || ''),
          graded: !!r?.graded,
          pointsAwarded: Number(r?.pointsAwarded || 0),
          correction: String(r?.correction || ''),
          modelAnswer: !!r?.modelAnswer,
        }))
      : [],
    modelResponses: !roomQuestion?.isPoll && (['open', 'image_open', 'speaking'].includes(roomQuestion?.type) || isTeacherGradedTextQuestion(roomQuestion))
      ? Object.entries(responses)
        .filter(([, r]) => !r?.hidden && !!r?.modelAnswer)
        .map(([pid, r]) => ({
          playerId: pid,
          name: room.players?.[pid]?.name || 'Student',
          answer: String(r?.answer || ''),
          correction: String(r?.correction || ''),
        }))
      : [],
    pollSummary: pollVisible ? summarizePoll(roomQuestion, pollResponses) : null,
    pollResponses,
    answerHistory,
    correctAnswer:
      (room.phase === 'question' || room.phase === 'results') && room.questionClosed && !roomQuestion?.isPoll
      && !['open', 'image_open', 'speaking'].includes(roomQuestion?.type)
      && !isTeacherGradedTextQuestion(roomQuestion)
        ? hostCorrectSummary(roomQuestion)
        : '',
    settings: {
      randomNames: !!room.settings?.randomNames,
    },
  };
}

function playerState(room, playerId) {
  const player = room.players[playerId];
  const qIndex = effectiveQuestionIndex(room);
  const responses = room.responsesByQuestion[qIndex] || {};

  const roomQuestion = room.quiz.questions[qIndex];
  const timeLimitSec = getQuestionTimeLimitSec(roomQuestion);

  const myResponse = responses[playerId] || null;

  const currentQ = room.quiz.questions[qIndex];
  const isTeacherGraded = currentQ && (currentQ.type === 'open' || currentQ.type === 'image_open' || currentQ.type === 'speaking' || isTeacherGradedTextQuestion(currentQ));
  const hasTeacherCorrection = !!String(myResponse?.correction || '').trim();
  const canRevealNow = (room.phase === 'question' || room.phase === 'results') && myResponse && !currentQ?.isPoll
    && (room.questionClosed || room.phase === 'results' || (isTeacherGraded && (!!myResponse.graded || hasTeacherCorrection)));

  return {
    phase: room.phase,
    pin: room.pin,
    name: player.name,
    identity: player.identity || null,
    currentIndex: qIndex,
    totalQuestions: room.quiz.questions.length,
    score: player.score,
    answeredCurrent: !!myResponse,
    revealedResult: canRevealNow
      ? {
          correct: !!myResponse.correct,
          pointsAwarded: Number(myResponse.pointsAwarded || 0),
          graded: !!myResponse.graded,
          correction: String(myResponse.correction || ''),
          bet: sanitizeBet(myResponse.bet),
        }
      : null,
    question: (room.phase === 'question' || room.phase === 'results') ? publicQuestion(room.quiz.questions[qIndex]) : null,
    correctAnswer:
      (room.phase === 'question' || room.phase === 'results') && room.questionClosed && !room.quiz.questions[qIndex]?.isPoll
      && !['open', 'image_open', 'speaking'].includes(room.quiz.questions[qIndex]?.type)
      && !isTeacherGradedTextQuestion(room.quiz.questions[qIndex])
        ? hostCorrectSummary(room.quiz.questions[qIndex])
        : '',
    questionClosed: room.phase === 'question' ? !!room.questionClosed : false,
    questionStartedAt: room.phase === 'question' ? room.questionStartedAt || null : null,
    questionDeadlineAt:
      room.phase === 'question' && room.questionStartedAt && Number.isFinite(timeLimitSec)
        ? Number(room.questionStartedAt) + timeLimitSec * 1000
        : null,
    questionClosedAt: room.phase === 'question' ? room.questionClosedAt || null : null,
    questionCloseReason: room.phase === 'question' ? room.questionCloseReason || null : null,
    serverNow: Date.now(),
    leaderboard: Object.values(room.players)
      .map((p) => ({ name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
  };
}

function hostQuestionPayload(question) {
  if (!question) return null;

  const base = publicQuestion(question);
  if (!base) return null;

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    const answers = (question.answers || []).map((a) => ({ text: a.text, isCorrect: !!a.correct }));
    const correctIndexes = answers.map((a, idx) => (a.isCorrect ? idx : null)).filter((idx) => idx !== null);
    return {
      ...base,
      answers,
      correctIndexes,
    };
  }

  if (question.type === 'text') {
    return {
      ...base,
      accepted: (question.accepted || []).filter(Boolean),
    };
  }

  if (question.type === 'puzzle') {
    return {
      ...base,
      items: [...(question.items || [])],
    };
  }

  if (question.type === 'slider') {
    return {
      ...base,
      target: question.target,
    };
  }

  if (question.type === 'match_pairs') {
    return {
      ...base,
      pairs: (question.pairs || []).map((p) => ({
        left: String(p?.left || ''),
        right: String(p?.right || ''),
      })),
    };
  }

  if (question.type === 'pin') {
    const zones = (Array.isArray(question.zones) && question.zones.length ? question.zones : [question.zone || { x: 50, y: 50, r: 15 }])
      .slice(0, 12)
      .map((z) => ({ x: Number(z?.x), y: Number(z?.y), r: Number(z?.r) }));
    return {
      ...base,
      zones,
      zone: zones[0] || null,
    };
  }

  return base;
}

function getQuestionTimeLimitSec(question) {
  if (!question) return null;
  const value = normalizeTimeLimitValue(question.timeLimit, question.type);
  if (value === 0) return null;
  return value;
}

function closeCurrentQuestion(room, reason = 'manual_reveal') {
  if (room.phase !== 'question') return false;
  if (room.questionClosed) return false;

  room.questionClosed = true;
  room.questionClosedAt = Date.now();
  room.questionCloseReason = String(reason || 'manual_reveal');
  appendRoomEvent(room, 'question_closed', {
    qIndex: Number(room.currentIndex || 0),
    reason: room.questionCloseReason,
    closedAt: room.questionClosedAt,
  });
  room.updatedAt = Date.now();
  return true;
}

function closeQuestionIfTimedOut(room) {
  if (room.phase !== 'question' || room.questionClosed) return false;

  const question = room.quiz.questions?.[room.currentIndex];
  if (!question) return false;

  const startedAt = Number(room.questionStartedAt || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return false;

  const timeLimitSec = getQuestionTimeLimitSec(question);
  if (!Number.isFinite(timeLimitSec) || timeLimitSec <= 0) return false;
  const deadline = startedAt + timeLimitSec * 1000;

  if (Date.now() < deadline) return false;
  return closeCurrentQuestion(room, 'timeout');
}

function startQuestion(room, index) {
  const qIndex = Number(index);
  if (!Number.isFinite(qIndex)) return false;
  if (qIndex < 0 || qIndex >= room.quiz.questions.length) return false;

  room.phase = 'question';
  room.currentIndex = qIndex;
  room.questionStartedAt = Date.now();
  room.questionClosed = false;
  room.questionClosedAt = null;
  room.questionCloseReason = null;
  room.responsesByQuestion = room.responsesByQuestion || {};
  room.responsesByQuestion[qIndex] = {};
  room.scoreLocksByQuestion = room.scoreLocksByQuestion || {};
  room.scoreLocksByQuestion[qIndex] = room.scoreLocksByQuestion[qIndex] || {};
  appendRoomEvent(room, 'question_started', {
    qIndex,
    qType: String(room.quiz?.questions?.[qIndex]?.type || ''),
    startedAt: room.questionStartedAt,
  });
  room.updatedAt = Date.now();
  return true;
}

function publicQuestion(question) {
  if (!question) return null;

  if (['mcq', 'multi', 'tf', 'audio'].includes(question.type)) {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      answers: (question.answers || []).map((a) => ({ text: a.text })),
      imageData: String(question.imageData || '') || undefined,
      ...publicAudioPayload(question),
    };
  }

  if (question.type === 'text' || question.type === 'open' || question.type === 'image_open' || question.type === 'speaking' || question.type === 'context_gap' || question.type === 'match_pairs' || question.type === 'error_hunt') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      imageData: String(question.imageData || '') || undefined,
      gapCount: question.type === 'context_gap' ? Number((question.gaps || []).filter(Boolean).length || 0) : undefined,
      leftItems: question.type === 'match_pairs' ? (question.pairs || []).map((p) => String(p.left || '')) : undefined,
      rightOptions: question.type === 'match_pairs' ? stableShuffle((question.pairs || []).map((p) => String(p.right || '')), question.id || question.prompt || 'pairs') : undefined,
      requiredErrors: question.type === 'error_hunt' ? countErrorHuntRequiredTokens(question.prompt, question.corrected) : undefined,
      ...publicAudioPayload(question),
    };
  }

  if (question.type === 'puzzle') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      length: (question.items || []).length,
      options: stableShuffle(question.items || [], question.id || question.prompt || 'puzzle'),
      imageData: String(question.imageData || '') || undefined,
      ...publicAudioPayload(question),
    };
  }

  if (question.type === 'slider') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      min: question.min,
      max: question.max,
      margin: question.margin,
      unit: question.unit || '',
      imageData: String(question.imageData || '') || undefined,
      ...publicAudioPayload(question),
    };
  }

  if (question.type === 'pin') {
    return {
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      timeLimit: question.timeLimit,
      isPoll: !!question.isPoll,
      imageData: question.imageData || '',
      pinMode: String(question.pinMode || 'all') === 'any' ? 'any' : 'all',
      ...publicAudioPayload(question),
    };
  }

  return {
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    timeLimit: question.timeLimit,
    ...publicAudioPayload(question),
  };
}

function publicAudioPayload(question) {
  const enabled = !!question?.audioEnabled || question?.type === 'audio';
  if (!enabled) return { audioEnabled: false };
  return {
    audioEnabled: true,
    audioMode: ['tts', 'file'].includes(String(question?.audioMode || '')) ? String(question.audioMode) : (question?.audioData ? 'file' : 'tts'),
    audioText: String(question?.audioText || ''),
    language: String(question?.language || 'en-US-Wave'),
    audioData: String(question?.audioData || ''),
  };
}

function evaluate(question, answer) {
  if (!question) return { correct: false };

  if (['mcq', 'tf', 'audio'].includes(question.type)) {
    const selected = Number(answer);
    if (!Number.isFinite(selected)) return { correct: false };
    const correctIndex = (question.answers || []).findIndex((a) => !!a.correct);
    return { correct: selected === correctIndex };
  }

  if (question.type === 'multi') {
    const selected = Array.isArray(answer) ? answer.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
    if (!selected.length) return { correct: false };

    const expected = (question.answers || [])
      .map((a, idx) => (a.correct ? idx : null))
      .filter((x) => x !== null);

    if (selected.length !== expected.length) return { correct: false };
    return { correct: selected.every((idx) => expected.includes(idx)) };
  }

  if (question.type === 'text') {
    const guess = normalizeTextAnswer(answer);
    const accepted = (question.accepted || []).map(normalizeTextAnswer).filter(Boolean);
    return { correct: accepted.includes(guess) };
  }

  if (question.type === 'context_gap') {
    return { correct: isContextGapCorrect(answer, question.gaps || []) };
  }

  if (question.type === 'match_pairs') {
    return { correct: isMatchPairsCorrect(answer, question.pairs || []) };
  }

  if (question.type === 'error_hunt') {
    const rewrite = normalizeTextAnswer(answer?.rewrite ?? answer);
    const expected = normalizeTextAnswer(question.corrected || '');
    const variants = Array.isArray(question.correctedVariants) ? question.correctedVariants : [];
    const normalizedVariants = variants.map((v) => normalizeTextAnswer(v));
    const selected = Array.isArray(answer?.selectedTokens) ? answer.selectedTokens.map((x) => Number(x)).filter(Number.isFinite) : [];
    const required = countErrorHuntRequiredTokens(question.prompt, question.corrected);
    const uniqueCount = new Set(selected).size;
    if (uniqueCount !== required) return { correct: false };
    if (!rewrite) return { correct: false };
    const isCorrect = rewrite === expected || normalizedVariants.includes(rewrite);
    return { correct: isCorrect };
  }

  if (question.type === 'puzzle') {
    const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer) : [];
    const expected = (question.items || []).map(normalizeTextAnswer);
    if (!guess.length || guess.length !== expected.length) return { correct: false };
    return { correct: JSON.stringify(guess) === JSON.stringify(expected) };
  }

  if (question.type === 'slider') {
    const value = Number(answer);
    if (!Number.isFinite(value)) return { correct: false };
    const tol = sliderTolerance(question.margin, question.min, question.max);
    const diff = Math.abs(value - Number(question.target));
    return { correct: diff <= tol };
  }

  if (question.type === 'pin') {
    const zones = (Array.isArray(question.zones) && question.zones.length ? question.zones : [question.zone || { x: 50, y: 50, r: 15 }]).slice(0, 12);
    const picksRaw = Array.isArray(answer) ? answer : (answer && Number.isFinite(Number(answer.x)) && Number.isFinite(Number(answer.y)) ? [answer] : []);
    const picks = picksRaw
      .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!picks.length) return { correct: false };

    const coveredCount = zones.filter((z) => picks.some((p) => distance2D(p.x, p.y, Number(z?.x ?? 50), Number(z?.y ?? 50)) <= Number(z?.r ?? 15))).length;
    const pinMode = String(question.pinMode || 'all') === 'any' ? 'any' : 'all';
    const ok = pinMode === 'any' ? coveredCount >= 1 : coveredCount >= zones.length;
    return { correct: ok };
  }

  return { correct: false };
}

function normalizeQuiz(quiz) {
  const normalized = {
    version: 1,
    title: String(quiz.title || '').slice(0, 1200),
    questions: [],
  };

  (quiz.questions || []).forEach((q) => {
    const base = {
      id: String(q.id || randomId('q_')),
      type: q.type,
      prompt: String(q.prompt || '').slice(0, 1200),
      points: [0, 1000, 2000].includes(Number(q.points)) ? Number(q.points) : 1000,
      timeLimit: normalizeTimeLimitValue(q.timeLimit, q.type),
      isPoll: !!q.isPoll,
      audioEnabled: !!q.audioEnabled || q.type === 'audio',
      audioMode: ['tts', 'file'].includes(String(q.audioMode || '')) ? String(q.audioMode) : 'tts',
      audioText: String(q.audioText || '').slice(0, 1200),
      language: String(q.language || 'en-US-Wave').slice(0, 32) || 'en-US-Wave',
      audioData: String(q.audioData || ''),
      imageData: String(q.imageData || ''),
    };

    if (['mcq', 'multi', 'audio'].includes(q.type)) {
      const answers = (q.answers || [])
        .slice(0, 10)
        .map((a) => ({ text: String(a.text || '').slice(0, 90), correct: !!a.correct }))
        .filter((a) => a.text.trim().length > 0);
      if (answers.length < 2) return;

      if (q.type === 'multi') {
        let correctCount = answers.filter((a) => a.correct).length;
        if (correctCount < 2) {
          for (let i = 0; i < answers.length && correctCount < 2; i++) {
            if (!answers[i].correct) {
              answers[i].correct = true;
              correctCount++;
            }
          }
        }
      } else if (!answers.some((a) => a.correct)) {
        answers[0].correct = true;
      }

      normalized.questions.push({
        ...base,
        answers,
      });
      return;
    }

    if (q.type === 'tf') {
      const tfTrue = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'true');
      const tfFalse = (q.answers || []).find((a) => String(a?.text || '').trim().toLowerCase() === 'false');
      const answers = [
        { text: 'True', correct: tfTrue ? !!tfTrue.correct : !!q.answers?.[0]?.correct },
        { text: 'False', correct: tfFalse ? !!tfFalse.correct : !!q.answers?.[1]?.correct },
      ];
      if (!answers.some((a) => a.correct)) answers[0].correct = true;
      normalized.questions.push({ ...base, answers });
      return;
    }

    if (q.type === 'text') {
      normalized.questions.push({
        ...base,
        accepted: (q.accepted || []).slice(0, 20).map((x) => String(x || '').slice(0, 120)),
      });
      return;
    }

    if (q.type === 'open') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'speaking') {
      normalized.questions.push({ ...base });
      return;
    }

    if (q.type === 'image_open') {
      if (!q.imageData) return;
      normalized.questions.push({ ...base, imageData: String(q.imageData || '') });
      return;
    }

    if (q.type === 'context_gap') {
      const gaps = (q.gaps || []).map((x) => String(x || '').slice(0, 120)).filter(Boolean).slice(0, 10);
      if (gaps.length < 1) return;
      normalized.questions.push({ ...base, gaps });
      return;
    }

    if (q.type === 'match_pairs') {
      const pairs = (q.pairs || [])
        .map((p) => ({ left: String(p?.left || '').slice(0, 72).trim(), right: String(p?.right || '').slice(0, 72).trim() }))
        .filter((p) => p.left && p.right)
        .slice(0, 10);
      if (pairs.length < 2) return;
      normalized.questions.push({ ...base, pairs });
      return;
    }

    if (q.type === 'error_hunt') {
      const corrected = String(q.corrected || '').slice(0, 160).trim();
      if (!corrected) return;
      const correctedVariants = Array.isArray(q.correctedVariants)
        ? q.correctedVariants.map((x) => String(x || '').slice(0, 160).trim()).filter(Boolean).slice(0, 12)
        : [];
      const requiredErrors = countErrorHuntRequiredTokens(base.prompt, corrected);
      normalized.questions.push({ ...base, corrected, correctedVariants, requiredErrors });
      return;
    }

    if (q.type === 'puzzle') {
      const items = (q.items || []).map((x) => String(x || '').slice(0, 90)).filter(Boolean).slice(0, 12);
      if (items.length < 3) return;
      normalized.questions.push({ ...base, items });
      return;
    }

    if (q.type === 'slider') {
      const min = Number(q.min ?? 0);
      const max = Number(q.max ?? 100);
      const fixedMin = Math.min(min, max);
      const fixedMax = Math.max(min, max);

      normalized.questions.push({
        ...base,
        min: fixedMin,
        max: fixedMax,
        target: clamp(Number(q.target ?? fixedMin), fixedMin, fixedMax),
        margin: ['none', 'low', 'medium', 'high', 'maximum'].includes(q.margin) ? q.margin : 'medium',
        unit: String(q.unit || '').slice(0, 20),
      });
      return;
    }

    if (q.type === 'pin') {
      if (!q.imageData) return;
      const zonesSource = Array.isArray(q.zones) && q.zones.length ? q.zones : [q.zone || {}];
      const zones = zonesSource
        .slice(0, 12)
        .map((z) => ({
          x: round(clamp(Number(z?.x ?? 50), 0, 100), 1),
          y: round(clamp(Number(z?.y ?? 50), 0, 100), 1),
          r: round(clamp(Number(z?.r ?? 15), 1, 100), 1),
        }));
      normalized.questions.push({
        ...base,
        imageData: String(q.imageData || ''),
        zones,
        zone: zones[0],
        pinMode: String(q.pinMode || 'all') === 'any' ? 'any' : 'all',
      });
    }
  });

  if (!normalized.questions.length) {
    throw new Error('No valid questions for room.');
  }

  return normalized;
}

function stableShuffle(arr, seedInput) {
  const a = [...arr];
  let seed = hash(seedInput || 'seed');
  for (let i = a.length - 1; i > 0; i--) {
    seed = nextSeed(seed);
    const j = Math.floor(seed * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function nextSeed(seed) {
  // Mulberry32-like step mapped to [0,1)
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function sliderTolerance(margin, min, max) {
  const range = Math.max(0, Number(max) - Number(min));
  const map = {
    none: 0,
    low: range * 0.05,
    medium: range * 0.1,
    high: range * 0.2,
    maximum: range,
  };
  return map[margin] ?? map.medium;
}

function tokenizeWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function normalizeTextAnswer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[~`!@#$%^&*(){}\[\];:"'<,>.?\/\\|\-_+=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAcceptedGapOptions(value) {
  return String(value || '')
    .split(',')
    .map((x) => normalizeTextAnswer(x))
    .filter(Boolean);
}

function contextGapExpectedOptions(gaps) {
  return (Array.isArray(gaps) ? gaps : [])
    .map((g) => {
      const opts = parseAcceptedGapOptions(g);
      return opts.length ? opts : [normalizeTextAnswer(g)];
    })
    .filter((opts) => opts.some(Boolean));
}

function isContextGapCorrect(answer, gaps) {
  const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer).filter(Boolean) : [];
  const expected = contextGapExpectedOptions(gaps);
  if (!guess.length || guess.length !== expected.length) return false;
  return guess.every((g, i) => expected[i].includes(g));
}

function isMatchPairsCorrect(answer, pairsRaw) {
  const pairs = (Array.isArray(pairsRaw) ? pairsRaw : [])
    .map((p) => ({ left: normalizeTextAnswer(p?.left), right: normalizeTextAnswer(p?.right) }))
    .filter((p) => p.left && p.right);
  if (!pairs.length) return false;

  // New robust payload: [{left,right}, ...] (order-independent exact multiset compare)
  if (Array.isArray(answer) && answer.some((x) => x && typeof x === 'object')) {
    const expectedCounts = new Map();
    pairs.forEach((p) => {
      const key = `${p.left}=>${p.right}`;
      expectedCounts.set(key, (expectedCounts.get(key) || 0) + 1);
    });

    const gotCounts = new Map();
    answer.forEach((g) => {
      const left = normalizeTextAnswer(g?.left);
      const right = normalizeTextAnswer(g?.right);
      if (!left || !right) return;
      const key = `${left}=>${right}`;
      gotCounts.set(key, (gotCounts.get(key) || 0) + 1);
    });

    if (gotCounts.size !== expectedCounts.size) return false;
    for (const [k, v] of expectedCounts.entries()) {
      if ((gotCounts.get(k) || 0) !== v) return false;
    }
    return true;
  }

  // Backward compatibility: legacy payload = array of right-side values by left row order.
  const guess = Array.isArray(answer) ? answer.map(normalizeTextAnswer).filter(Boolean) : [];
  if (guess.length !== pairs.length) return false;

  const groups = new Map();
  pairs.forEach((p, idx) => {
    if (!groups.has(p.left)) groups.set(p.left, []);
    groups.get(p.left).push({ idx, right: p.right });
  });

  for (const entries of groups.values()) {
    const expected = entries.map((x) => x.right).sort();
    const got = entries.map((x) => guess[x.idx] || '').sort();
    if (JSON.stringify(expected) !== JSON.stringify(got)) return false;
  }
  return true;
}

function countErrorHuntRequiredTokens(prompt, corrected) {
  const source = tokenizeWords(prompt);
  const target = tokenizeWords(corrected);
  const rows = source.length + 1;
  const cols = target.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const same = normalizeTextAnswer(source[i - 1]) === normalizeTextAnswer(target[j - 1]);
      if (same) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1,
        );
      }
    }
  }

  return dp[source.length][target.length];
}

function distance2D(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function minTimeByType(type) {
  if (type === 'slider') return 10;
  if (['text', 'open', 'speaking', 'image_open', 'context_gap', 'match_pairs', 'error_hunt', 'puzzle', 'pin'].includes(type)) return 20;
  return 5;
}

function normalizeTimeLimitValue(value, type) {
  const raw = String(value ?? '').trim();
  if (raw === '') return 20;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 20;
  if (n <= 0) return 0;
  return clamp(n, minTimeByType(type), 240);
}

function makePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function verifyCreatePassword(env, password) {
  const raw = String(password || '');
  const hash = String(env.CREATE_PASSWORD_HASH || '').trim().toLowerCase();
  if (!hash) return false;
  const digest = await sha256Hex(raw);
  return digest === hash;
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sanitizePin(pin) {
  const p = String(pin || '').trim();
  return /^\d{6}$/.test(p) ? p : '';
}

function sanitizeAssignmentCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function sanitizeAssignmentAttemptId(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
}

function sanitizeAssignmentStudentKey(value) {
  const normalized = normalizeStudentKeyInput(value || '');
  return normalized.slice(0, 96);
}

function sanitizeAssignmentAnswer(_question, raw) {
  const walk = (v, depth = 0) => {
    if (depth > 3) return null;
    if (v == null) return null;
    if (typeof v === 'string') return v.slice(0, 500);
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.slice(0, 50).map((x) => walk(x, depth + 1));
    if (typeof v === 'object') {
      const out = {};
      Object.keys(v).slice(0, 20).forEach((k) => {
        out[String(k).slice(0, 40)] = walk(v[k], depth + 1);
      });
      return out;
    }
    return null;
  };
  return walk(raw, 0);
}

function isAssignmentTeacherGradedQuestion(question) {
  if (!question) return false;
  return question.type === 'open'
    || question.type === 'image_open'
    || question.type === 'speaking'
    || isTeacherGradedTextQuestion(question);
}

function evaluateAssignmentAttempt(assignment, attempt) {
  const answersByQ = attempt?.answersByQ && typeof attempt.answersByQ === 'object' ? attempt.answersByQ : {};
  const quizQuestions = assignment?.quiz?.questions || [];

  let answeredCount = 0;
  let correctCount = 0;
  let pendingTeacherGradeCount = 0;
  let autoGradedCount = 0;
  let teacherGradedCount = 0;
  let autoScore = 0;
  let teacherScore = 0;

  Object.entries(answersByQ).forEach(([idxRaw, item]) => {
    const qIndex = Number(idxRaw);
    const question = quizQuestions[qIndex];
    if (!question) return;

    answeredCount += 1;
    if (isAssignmentTeacherGradedQuestion(question)) {
      const grade = item?.teacherGrade;
      if (grade?.graded) {
        teacherGradedCount += 1;
        const pts = Math.max(0, Math.round(Number(grade?.pointsAwarded || 0)));
        teacherScore += pts;
        if (pts > 0) correctCount += 1;
      } else {
        pendingTeacherGradeCount += 1;
      }
      return;
    }

    if (question.isPoll) {
      autoGradedCount += 1;
      return;
    }

    const verdict = evaluate(question, item?.answer);
    autoGradedCount += 1;
    if (verdict?.correct) {
      correctCount += 1;
      autoScore += Math.round(Number(question.points || 1000));
    }
  });

  const gradedCount = autoGradedCount + teacherGradedCount;
  const accuracy = gradedCount > 0 ? round((correctCount / gradedCount) * 100, 1) : null;

  return {
    answeredCount,
    correctCount,
    pendingTeacherGradeCount,
    autoGradedCount,
    teacherGradedCount,
    autoScore: Math.round(autoScore),
    teacherScore: Math.round(teacherScore),
    totalScore: Math.round(autoScore + teacherScore),
    accuracy,
    totalQuestions: Number(quizQuestions.length || 0),
  };
}

function publicAssignmentAttempt(assignment, attempt, { includeAnswers = false } = {}) {
  const metrics = evaluateAssignmentAttempt(assignment, attempt);
  const hasTeacherGraded = Array.isArray(assignment?.quiz?.questions)
    ? assignment.quiz.questions.some((q) => isAssignmentTeacherGradedQuestion(q))
    : false;

  let answersWithCorrectness = null;
  if (includeAnswers && !hasTeacherGraded) {
    const answers = attempt?.answersByQ && typeof attempt.answersByQ === 'object' ? attempt.answersByQ : {};
    answersWithCorrectness = Object.entries(answers).map(([idxRaw, item]) => {
      const qIndex = Number(idxRaw);
      const question = assignment?.quiz?.questions?.[qIndex];
      if (!question || isAssignmentTeacherGradedQuestion(question)) return null;
      const verdict = evaluate(question, item?.answer);
      return {
        qIndex,
        correct: verdict?.correct === true,
        answer: item?.answer ?? null,
        correctAnswer: hostCorrectSummary(question),
      };
    }).filter(Boolean);
  }

  return {
    id: sanitizeAssignmentAttemptId(attempt?.id),
    code: sanitizeAssignmentCode(assignment?.code),
    studentKey: sanitizeAssignmentStudentKey(attempt?.studentKey),
    studentName: sanitizeName(attempt?.studentName || 'Student'),
    startedAt: Number(attempt?.startedAt || 0) || null,
    updatedAt: Number(attempt?.updatedAt || 0) || null,
    submitted: !!attempt?.submitted,
    submittedAt: Number(attempt?.submittedAt || 0) || null,
    assignment: publicAssignment(assignment, { includeQuiz: true }),
    metrics,
    answeredQIndexes: Object.keys(attempt?.answersByQ || {}).map((x) => Number(x)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b),
    answersWithCorrectness,
  };
}

function publicAssignmentAttemptSummary(assignment, attempt) {
  const full = publicAssignmentAttempt(assignment, attempt);
  return {
    id: full.id,
    studentKey: full.studentKey,
    studentName: full.studentName,
    startedAt: full.startedAt,
    updatedAt: full.updatedAt,
    submitted: full.submitted,
    submittedAt: full.submittedAt,
    metrics: full.metrics,
    answeredQIndexes: full.answeredQIndexes,
  };
}

function buildTeacherGradingItems(assignment, attempt) {
  const questions = assignment?.quiz?.questions || [];
  const answersByQ = attempt?.answersByQ && typeof attempt.answersByQ === 'object' ? attempt.answersByQ : {};

  return Object.entries(answersByQ)
    .map(([idxRaw, item]) => {
      const qIndex = Number(idxRaw);
      const question = questions[qIndex];
      if (!question) return null;

      const teacher = isAssignmentTeacherGradedQuestion(question);
      const grade = item?.teacherGrade || null;
      const maxPoints = Math.max(0, Math.round(Number(question?.points || 1000)));

      return {
        qIndex,
        qType: String(question?.type || ''),
        prompt: String(question?.prompt || ''),
        teacherGraded: teacher,
        answer: item?.answer ?? null,
        answerText: summarizeHistoryAnswer(question, item?.answer),
        maxPoints,
        grade: grade && typeof grade === 'object'
          ? {
              graded: !!grade.graded,
              pointsAwarded: Number(grade.pointsAwarded || 0),
              correction: String(grade.correction || ''),
              gradedAt: Number(grade.gradedAt || 0) || null,
            }
          : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.qIndex || 0) - Number(b.qIndex || 0));
}

async function loadAssignmentsMap(storage) {
  const map = await storage.get('assignments');
  if (!map || typeof map !== 'object') return {};
  return map;
}

async function nextAssignmentCode(storage) {
  const assignments = await loadAssignmentsMap(storage);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let tries = 0; tries < 40; tries += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!assignments[code]) return code;
  }

  return sanitizeAssignmentCode(randomId('A').slice(-6));
}

function publicAssignment(assignment, { includeQuiz = false } = {}) {
  if (!assignment || typeof assignment !== 'object') return null;
  const base = {
    id: String(assignment.id || ''),
    code: sanitizeAssignmentCode(assignment.code),
    createdAt: Number(assignment.createdAt || 0) || null,
    updatedAt: Number(assignment.updatedAt || 0) || null,
    title: String(assignment.title || '').slice(0, 120),
    className: sanitizeClassName(assignment.className || ''),
    attemptsLimit: clamp(Math.round(Number(assignment.attemptsLimit ?? 1)), 0, 10),
    dueAt: Number(assignment.dueAt || 0) > 0 ? Math.round(Number(assignment.dueAt || 0)) : null,
    randomNames: !!assignment.randomNames,
    feedbackMode: assignment.feedbackMode || 'none',
    active: !!assignment.active,
    quizTitle: String(assignment.quiz?.title || ''),
    totalQuestions: Number(assignment.quiz?.questions?.length || 0),
  };
  if (includeQuiz) {
    const quiz = normalizeQuiz(assignment.quiz || {});
    base.quiz = {
      title: String(quiz?.title || ''),
      questions: Array.isArray(quiz?.questions) ? quiz.questions.map((q) => publicQuestion(q)) : [],
    };
  }
  return base;
}

function sanitizeName(name) {
  const cleaned = String(name || '').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 40);
}

function sanitizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 120) : '';
}

function sanitizeClassName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function normalizeStudentKeyInput(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9@._|:-]+/g, '');
}

async function normalizeStudentIdentity(verifyData, fallbackName) {
  const data = verifyData && typeof verifyData === 'object' ? verifyData : {};

  const username = sanitizeName(data.username || data.user || fallbackName || '');
  const displayName = sanitizeName(data.displayName || data.display_name || username || fallbackName || '');
  const email = sanitizeEmail(data.email || data.schoolEmail || data.mail || data.userEmail);
  const className = sanitizeClassName(data.class || data.className || data.group || data.section);
  const studentIdRaw = sanitizeId(data.studentId || data.student_id || data.id || '');
  const keySeed = normalizeStudentKeyInput(
    data.studentKey
    || data.student_key
    || studentIdRaw
    || email
    || `${normalizeNameKey(username)}|${normalizeNameKey(className)}`,
  );

  const studentKey = keySeed ? `stu_${(await sha256Hex(`pinplay:${keySeed}`)).slice(0, 20)}` : '';

  return {
    username,
    displayName,
    className,
    email,
    studentKey,
    source: 'verified-login',
  };
}

function sanitizeReaction(emoji) {
  const value = String(emoji || '').trim();
  return ALLOWED_REACTIONS.has(value) ? value : '';
}

function sanitizeBet(value) {
  const n = Number(value || 0);
  return n === 1 || n === 2 || n === 3 ? n : 0;
}

function applyBetScore(questionPoints, baseAwarded, isCorrect, bet) {
  const b = sanitizeBet(bet);
  const qPoints = Math.max(0, Number(questionPoints || 0));
  const base = Number(baseAwarded || 0);

  if (!b) return Math.round(base);

  if (isCorrect) {
    const bonusRate = b === 1 ? 0.15 : (b === 2 ? 0.25 : 0.4);
    return Math.round(base * (1 + bonusRate));
  }

  const penaltyRate = b === 1 ? 0.05 : (b === 2 ? 0.15 : 0.3);
  return -Math.round(qPoints * penaltyRate);
}

function normalizeNameKey(name) {
  return String(name || '').trim().toLowerCase();
}

function findPlayerByClientId(room, clientId) {
  if (!clientId) return null;
  return Object.values(room.players || {}).find((p) => String(p.clientId || '') === clientId) || null;
}

function appendRoomEvent(room, type, payload = {}) {
  if (!room || typeof room !== 'object') return;
  room.eventLog = Array.isArray(room.eventLog) ? room.eventLog : [];
  const event = {
    id: randomId('ev_'),
    at: Date.now(),
    type: String(type || 'event'),
    payload: payload && typeof payload === 'object' ? payload : {},
  };
  room.eventLog.push(event);
  if (room.eventLog.length > MAX_ROOM_EVENTS) {
    room.eventLog.splice(0, room.eventLog.length - MAX_ROOM_EVENTS);
  }
}

function buildAttemptSnapshots(room) {
  const players = Object.values(room?.players || {});
  const perStudent = new Map();

  const ensure = (player) => {
    const identity = player?.identity || {};
    const key = String(identity.studentKey || player?.id || '').trim() || String(player?.id || 'unknown');
    if (!perStudent.has(key)) {
      perStudent.set(key, {
        studentKey: key,
        username: String(identity.username || player?.name || '').trim(),
        className: String(identity.className || '').trim(),
        email: String(identity.email || '').trim(),
        displayName: String(player?.name || '').trim(),
        source: String(identity.source || '').trim(),
        joinedAt: Number(player?.joinedAt || 0) || null,
        answeredCount: 0,
        autoGradedCount: 0,
        teacherGradedCount: 0,
        pendingTeacherGradeCount: 0,
        correctCount: 0,
        pointsAuto: 0,
        pointsTeacher: 0,
        scoreCurrent: Number(player?.score || 0),
        lastAnswerAt: null,
        eventCount: 0,
      });
    }
    return perStudent.get(key);
  };

  players.forEach((p) => ensure(p));

  const responsesByQ = room?.responsesByQuestion || {};
  Object.keys(responsesByQ).forEach((idxRaw) => {
    const qIndex = Number(idxRaw);
    const question = room?.quiz?.questions?.[qIndex];
    const teacherGraded = !!(question && (
      question.type === 'open'
      || question.type === 'image_open'
      || question.type === 'speaking'
      || isTeacherGradedTextQuestion(question)
    ));

    const perQ = responsesByQ[idxRaw] || {};
    Object.entries(perQ).forEach(([playerId, resp]) => {
      const p = room?.players?.[playerId];
      if (!p) return;
      const row = ensure(p);
      row.answeredCount += 1;

      const submittedAt = Number(resp?.submittedAt || 0) || null;
      if (submittedAt && (!row.lastAnswerAt || submittedAt > row.lastAnswerAt)) {
        row.lastAnswerAt = submittedAt;
      }

      if (teacherGraded) {
        if (resp?.graded) {
          row.teacherGradedCount += 1;
          row.pointsTeacher += Number(resp?.pointsAwarded || 0);
        } else {
          row.pendingTeacherGradeCount += 1;
        }
      } else {
        row.autoGradedCount += 1;
        row.pointsAuto += Number(resp?.pointsAwarded || 0);
      }

      if (resp?.correct) row.correctCount += 1;
    });
  });

  const eventLog = Array.isArray(room?.eventLog) ? room.eventLog : [];
  const byKey = new Map();
  eventLog.forEach((ev) => {
    const key = String(ev?.payload?.identity?.studentKey || '').trim();
    if (!key) return;
    byKey.set(key, (byKey.get(key) || 0) + 1);
  });

  const attempts = [...perStudent.values()]
    .map((r) => ({
      ...r,
      pointsAuto: Math.round(Number(r.pointsAuto || 0)),
      pointsTeacher: Math.round(Number(r.pointsTeacher || 0)),
      scoreCurrent: Math.round(Number(r.scoreCurrent || 0)),
      accuracy: r.answeredCount > 0 ? round((r.correctCount / r.answeredCount) * 100, 1) : null,
      eventCount: Number(byKey.get(String(r.studentKey || '')) || 0),
    }))
    .sort((a, b) => {
      const c = String(a.className || '').localeCompare(String(b.className || ''));
      if (c !== 0) return c;
      return String(a.username || a.displayName || '').localeCompare(String(b.username || b.displayName || ''));
    });

  return {
    pin: room?.pin || '',
    attemptId: `${room?.pin || 'room'}:${Number(room?.createdAt || 0) || 0}`,
    createdAt: Number(room?.createdAt || 0) || null,
    updatedAt: Number(room?.updatedAt || 0) || null,
    quiz: {
      title: String(room?.quiz?.title || '').trim(),
      questions: Number(room?.quiz?.questions?.length || 0),
    },
    students: attempts,
  };
}

function summarizePoll(question, responses) {
  const list = Array.isArray(responses) ? responses : [];
  const visible = list.filter((r) => !r?.hidden);
  const hiddenCount = list.length - visible.length;
  const counts = new Map();

  const pushCount = (label) => {
    const key = String(label || '').trim() || '(blank)';
    counts.set(key, (counts.get(key) || 0) + 1);
  };

  const answers = visible.map((r) => r?.answer);

  if (['mcq', 'tf', 'audio'].includes(question?.type)) {
    answers.forEach((a) => {
      const idx = Number(a);
      const txt = Number.isFinite(idx) ? String(question.answers?.[idx]?.text || `Option ${idx + 1}`) : '(blank)';
      pushCount(txt);
    });
  } else if (question?.type === 'multi') {
    answers.forEach((a) => {
      const arr = Array.isArray(a) ? a : [];
      const key = arr.map((idx) => String(question.answers?.[Number(idx)]?.text || '')).filter(Boolean).join(' + ');
      pushCount(key || '(none)');
    });
  } else if (question?.type === 'slider') {
    answers.forEach((a) => pushCount(String(Math.round(Number(a || 0)))));
  } else if (question?.type === 'pin') {
    answers.forEach((a) => {
      const x = Math.round(Number(a?.x || 0));
      const y = Math.round(Number(a?.y || 0));
      pushCount(`(${x}%, ${y}%)`);
    });
  } else if (question?.type === 'error_hunt') {
    answers.forEach((a) => pushCount(String(a?.rewrite || '')));
  } else if (question?.type === 'context_gap' || question?.type === 'match_pairs' || question?.type === 'puzzle') {
    answers.forEach((a) => pushCount(Array.isArray(a) ? a.join(' | ') : String(a || '')));
  } else {
    answers.forEach((a) => pushCount(String(a || '')));
  }

  const allItems = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const items = allItems.slice(0, 15);
  const overflowCount = allItems.slice(15).reduce((sum, x) => sum + Number(x.count || 0), 0);

  return {
    type: question?.type || 'unknown',
    total: list.length,
    hiddenCount,
    otherCount: hiddenCount + overflowCount,
    items,
  };
}

function hostCorrectSummary(question) {
  if (!question) return '';

  if (['mcq', 'tf', 'audio'].includes(question.type)) {
    const idx = (question.answers || []).findIndex((a) => !!a.correct);
    return idx >= 0 ? `${idx + 1}. ${(question.answers[idx]?.text || '').trim()}` : '';
  }

  if (question.type === 'multi') {
    const values = (question.answers || [])
      .map((a, idx) => (a.correct ? `${idx + 1}. ${a.text}` : null))
      .filter(Boolean);
    return values.join(' | ');
  }

  if (question.type === 'text') {
    if (isTeacherGradedTextQuestion(question)) return 'Teacher-graded typed answer';
    return (question.accepted || []).filter(Boolean).join(' | ');
  }

  if (question.type === 'context_gap') {
    return (question.gaps || []).filter(Boolean).join(' | ');
  }

  if (question.type === 'match_pairs') {
    return (question.pairs || []).map((p) => `${p.left}→${p.right}`).join(' | ');
  }

  if (question.type === 'error_hunt') {
    return String(question.corrected || '');
  }

  if (question.type === 'open' || question.type === 'image_open' || question.type === 'speaking') {
    return question.type === 'speaking' ? 'Teacher-graded speaking answer' : 'Teacher-graded open short answer';
  }

  if (question.type === 'puzzle') {
    return (question.items || []).join(' > ');
  }

  if (question.type === 'slider') {
    return `${question.target}${question.unit ? ` ${question.unit}` : ''}`;
  }

  if (question.type === 'pin') {
    return 'Pin zone set';
  }

  return '';
}

function isTeacherGradedTextQuestion(question) {
  if (!question || question.type !== 'text') return false;
  const accepted = (question.accepted || []).map((x) => String(x || '').trim()).filter(Boolean);
  return accepted.length === 0;
}

function hasBlockedNickname(name) {
  const value = String(name || '').trim();
  if (!value) return true;
  return BLOCKED_NICK_PATTERNS.some((re) => re.test(value));
}

function pickRandomName(playersMap) {
  const used = new Set(Object.values(playersMap || {}).map((p) => String(p.name || '').toLowerCase()));

  const adjectives = RANDOM_NAME_ADJECTIVES;
  const people = RANDOM_NAME_PEOPLE;
  const womenPeople = people.filter((n) => FEMALE_NAME_HINTS.has(String(n || '').toLowerCase()));
  const peopleTarget = womenPeople.length > 0 && Math.random() < 0.5 ? womenPeople : people;
  const total = adjectives.length * peopleTarget.length;

  for (let i = 0; i < Math.min(total, 320); i += 1) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)] || 'Happy';
    const person = peopleTarget[Math.floor(Math.random() * peopleTarget.length)] || 'Player';
    const candidate = `${adj} ${person}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }

  for (const adj of adjectives) {
    for (const person of peopleTarget) {
      const candidate = `${adj} ${person}`;
      if (!used.has(candidate.toLowerCase())) return candidate;
    }
  }

  for (const adj of adjectives) {
    for (const person of people) {
      const candidate = `${adj} ${person}`;
      if (!used.has(candidate.toLowerCase())) return candidate;
    }
  }

  const fallback = `${adjectives[0] || 'Happy'} ${people[0] || 'Player'}`;
  let n = 2;
  while (used.has(`${fallback.toLowerCase()} ${n}`)) n += 1;
  return `${fallback} ${n}`;
}

function isHttpUrl(value) {
  const s = String(value || '').trim();
  return /^https?:\/\//i.test(s);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer || new ArrayBuffer(0));
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function sanitizeId(id) {
  return String(id || '').trim().slice(0, 128);
}

function randomToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

function randomId(prefix = '') {
  return `${prefix}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function round(n, d = 0) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function readBearer(request) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return '';
  return auth.slice(7).trim();
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function withCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}


