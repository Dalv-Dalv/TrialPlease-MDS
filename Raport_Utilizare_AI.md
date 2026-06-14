# Raport: Utilizarea Inteligenței Artificiale în Dezvoltarea Proiectului

## 1. Faza Inițială: Utilizarea LLM-urilor în Browser (Web-based)

În primele etape ale dezvoltării proiectului, integrarea Inteligenței Artificiale a fost realizată prin intermediul interfețelor web ale diferitelor LLM-uri (Large Language Models). Fluxul de lucru presupunea formularea cerințelor în browser și copierea soluțiilor generate înapoi în mediul nostru de dezvoltare.

**Provocări și limitări întâmpinate:**
- **Flux de lucru ineficient:** Metoda bazată exclusiv pe *copy-paste* s-a dovedit a fi greoaie și consumatoare de timp.
- **Lipsa contextului:** Modelele AI nu aveau vizibilitate directă asupra întregului *codebase*, ceea ce ducea uneori la soluții care nu se integrau perfect cu restul aplicației.
- **Dificultăți de colaborare:** Faptul că AI-ul nu era sincronizat cu starea actuală (real-time) a codului a îngreunat munca în echipă, generând neconcordanțe și necesitatea unor ajustări manuale frecvente.

## 2. Tranziția către AI Agentic: Adoptarea Antigravity

Pentru a depăși aceste limitări, echipa a luat decizia de a trece la utilizarea **Antigravity**, un asistent AI integrat direct în IDE. Această schimbare a transformat fundamental modul în care interacționăm cu AI-ul.

**Avantajele noului flux de lucru:**
- **Context complet:** AI-ul are acces direct la fișierele proiectului, înțelegând structura, dependențele și starea exactă a codului la orice moment dat.
- **Prompting avansat:** Am început această etapă prin trimiterea unor prompt-uri extinse și detaliate care descriau viziunea de ansamblu și cerințele complexe ale sistemului.
- **Generarea planurilor:** Pe baza acestor prompt-uri, Antigravity a generat **Planuri de Implementare** (Implementation Plans) structurate, înainte de a scrie codul efectiv.

## 3. Revizuirea și Aprobarea Planurilor de Implementare

Un aspect crucial al colaborării cu Antigravity a fost faza de planificare (Planning Mode). În loc ca AI-ul să modifice direct fișierele orbește, acesta ne-a furnizat documente `.md` detaliind pașii de arhitectură, componentele ce urmau a fi modificate și design-ul general.

Echipa a luat parte la procesul de **Review** al acestor planuri, validând propunerile și aducând clarificări acolo unde a fost necesar, asigurând astfel o direcție corectă înainte de execuție.

---

### Exemple de Planuri de Implementare Generate:

<details>
<summary><b>1. Implementare Modul Înregistrare (Register)</b> (Click pentru a extinde)</summary>

Acest plan detaliază modul în care s-a implementat crearea de conturi noi în backend-ul Django, permițând utilizatorilor să se înregistreze pentru a juca TrialSim AI.

#### User Review Required

> [!IMPORTANT]  
> După crearea contului, dorești ca API-ul să returneze imediat token-ul de autentificare (pentru ca utilizatorul să fie logat automat după înregistrare) sau dorești ca utilizatorul să fie nevoit să facă un apel separat de Login? Voi alege varianta de a returna token-ul automat dacă nu ai alte preferințe.

> [!NOTE]
> Vom folosi modelul implicit `User` din Django. Câmpurile obligatorii vor fi `username`, `email` și `password`.

#### Proposed Changes

**Backend API**

- **[MODIFY] [serializers.py](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/Django_Backend/api/serializers.py)**
  Adăugarea unui `RegisterSerializer` care preia `username`, `email` și `password`, le validează și folosește `User.objects.create_user(...)` pentru a crea contul și a cripta parola corect.

- **[MODIFY] [views.py](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/Django_Backend/api/views.py)**
  Adăugarea unei noi clase `RegisterView` (cu permisiunea `AllowAny` pentru ca oricine să se poată înregistra). Procesează request-ul de înregistrare și returnează datele utilizatorului (și token-ul).

- **[MODIFY] [urls.py](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/Django_Backend/api/urls.py)**
  Adăugarea rutei noi `path('register/', RegisterView.as_view(), name='register')` pentru a expune endpoint-ul.

#### Verification Plan

**Manual Verification**
- Request `POST /api/register/` cu un payload JSON pentru a verifica dacă se creează contul.
- Request `POST /api/login/` cu datele contului creat pentru a confirma criptarea corectă a parolei.
</details>

<details>
<summary><b>2. Gestiune Cont & Case History</b> (Click pentru a extinde)</summary>

Acest plan detaliază dezvoltarea paginii de profil, conectarea logicii de register cu backend-ul și crearea istoricului cazurilor jucate de utilizator.

#### User Review Required

> [!IMPORTANT]
> **Pentru istoricul replicilor:** Este în regulă să stocăm transcriptul cronologic (toate replicile) sub forma unui câmp de tip `JSONField` în tabelul `UserCaseHistory`? Acest lucru va fi mai eficient decât să creăm o intrare separată în baza de date pentru *fiecare* replică individuală, permițând frontend-ului să afișeze ușor "dosarul cazului" reconstruind chat-ul.
> 
> **Ce trebuie să se afișeze în Dosarul Cazului (Istoric)?** Momentan voi afișa: Detaliile cazului, Verdictul dat de tine, Verdictul corect, și o listă cronologică (un chat log) cu ce au zis avocații/martorii. Dacă vrei mai multe, te rog să menționezi.

#### Proposed Changes

**1. Conectare Register (Frontend -> Backend)**
- **[MODIFY] [auth.tsx](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/R3F_Frontend/src/store/auth.tsx)**
  - Modificarea funcției `register` pentru a face un apel POST real către `http://localhost:8000/api/register/` transmițând `username`, `email` și `password`.
  - După succes, apelarea `setUser(...)` cu detaliile primite pentru a loga utilizatorul imediat.
- **[MODIFY] [Register.tsx](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/R3F_Frontend/src/pages/auth/register/Register.tsx)**
  - Actualizarea formularului pentru a cere `username` pe lângă `email` și `password`.

**2. Gestiunea Contului (Profile & History) - Backend**
- **[MODIFY] [models.py](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/Django_Backend/api/models.py)**
  - **[NEW] Model `UserCaseHistory`**: Conține un `ForeignKey` către `User`, un `ForeignKey` către `Case`, un `JSONField` numit `transcript` (pentru istoricul cronologic), `verdict_given` și `verdict_correct` (boolean), `created_at` și `updated_at`.
- **[MODIFY] [serializers.py](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/Django_Backend/api/serializers.py)**
  - **[NEW] `UserCaseHistorySerializer`**: Pentru a trimite istoricul către frontend.
- **[MODIFY] [views.py](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/Django_Backend/api/views.py)**
  - **[NEW] `UserProfileView`**: Un endpoint (`GET /api/profile/`) ce returnează datele userului și lista lui de `UserCaseHistory`.
  - Modificarea endpoint-urilor existente de trial pentru ca la finalul procesului să se salveze acest `UserCaseHistory`.
- **[MODIFY] [urls.py](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/Django_Backend/api/urls.py)**
  - Rute noi: `path('profile/', UserProfileView.as_view(), name='profile')`.

**3. Gestiunea Contului - Frontend**
- **[NEW] [Profile.tsx](file:///c:/Dalv/School/University/Classes/Semestrul4/MDS/TrialPlease-MDS/R3F_Frontend/src/pages/main-menu/Profile.tsx)**
  - Interfață de UI unde jucătorul vede informațiile contului (Username, Email) și lista de cazuri jucate.
  - Făcând click pe un caz din istoric, se deschide "Dosarul Cazului" afișând un sumar text și cronologia replicilor stocate în `transcript`.

#### Verification Plan

**Manual Verification**
1. Rularea serverelor și folosirea paginii din browser pentru crearea unui cont (cu noul câmp de username) - frontend-ul loghează utilizatorul corect.
2. Simularea trimiterii unui istoric către endpoint pentru a vedea dacă se salvează cu succes în noul model `UserCaseHistory`.
3. Accesarea paginii de Profil din frontend pentru verificarea randării istoricului sub formă de dosar.
</details>

---

## 4. Concluzii și Impactul asupra Echipei

Adoptarea asistentului agentic Antigravity a rezolvat problemele inițiale de comunicare și sincronizare a codului. 

- S-a eliminat efortul repetitiv de *copy-paste*.
- Colaborarea echipei a devenit mai fluidă, întrucât planurile de implementare au servit și ca documentație tehnică.
- AI-ul a devenit un "pair programmer" eficient, având întotdeauna cel mai proaspăt context al repozitorului.
