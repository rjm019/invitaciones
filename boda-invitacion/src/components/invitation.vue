<template>
    <div class="invitation">
      <!-- Reproductor de audio -->
      <div class="audio-player">
        <audio ref="audioPlayer" :src="audioSrc" @timeupdate="updateProgress" @loadedmetadata="setDuration"></audio>
        <div class="audio-controls">
          <button @click="togglePlay" class="play-button">
            <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
          </button>
          <span class="current-time">{{ formatTime(currentTime) }}</span>
          <input
            type="range"
            class="progress-bar"
            v-model="progress"
            @input="seekAudio"
          />
          <span class="duration">{{ formatTime(duration) }}</span>
        </div>
        <p class="audio-title">REPRODUCE Y DESLIZA HACIA ABAJO</p>
      </div>
      <!-- Sección de título y nombres -->
      <div class="title-section">
        <br><br>
        <p class="title-principal" >
          <span class="spaced-title">NUESTRA BODA</span>
        </p>
        <br><br><br>
        <img src="/novios.jpeg" alt="Novios" class="image" />
        <p class="names">
          <img src="/cj.png" alt="Novios" class="image" />
        </p>
      </div>
      
  
  
      <!-- Sección de la fecha -->
      <div v-if="!showEtiqueta" class="date-section">
        <div class="date-text">
          <span class="day">Sábado</span><br />
          <span class="day-number">22</span><br />
          <span class="month">febrero</span><br />
          <span class="year">2025</span><br />
          <span class="time">16:00 HRS</span>
        </div>
        
        <!-- Filtro oscuro para la imagen -->
        <div class="image-overlay"></div>
        
        <img src="/fecha.jpeg" alt="Fecha" class="date-image" />
      </div>
      
  
      <div class="fathers-section">
        <br><br>
      <div class="names-fathers">
        <p class="title-fathers">
          <span>CON LA BENDICION DE NUESTROS PADRES:</span>
        </p>
        <i class="fas fa-child"></i> <!-- Representa a un niño -->
        <i class="fas fa-male" style="font-size: 1.5rem;"></i> <!-- Representa a un hombre -->
  
        <br><br>
        <div class="parents-table">
          <div class="parent-row">
            <span class="label">Padres de la novia:</span><br/><br/>
            <span class="names">José Luis Hernández</span><br/>
            <span class="names">Isabel Romero Bonilla</span><br/>
          </div>
          <br><br><br>
          <div class="parent-row">
            <i class="fas fa-child"></i> <!-- Representa a un niño -->
            <i class="fas fa-male" style="font-size: 1.5rem;"></i> <!-- Representa a un hombre -->
            <br/><br/>
            <span class="label">Padres del novio:</span><br/><br/>
            <span class="names">Ofelia Montiel Mote</span><br/>
            <span class="names">Juan Manuel Rojas Esquivel</span><br/>
          </div>
        </div>
        </div>
      </div>
  
      <div class="godparents-section">
        <div class="godparents-card">
          <img src="/decor.jpeg" alt="Decoración" class="godparents-image" />
          <div class="godparents-overlay">
            <p class="title-godparents">Padrinos de velación</p>
            <div class="godparents-table">
              <div class="godparents-row">
                <span class="names">Manuel Alejandro Hernández</span><br />
                <span class="names">Sandra Anaya</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  
  
        <div v-if="showEtiqueta" class="dresscode-section">
          <div class="dresscode-text">
            <span class="title-codedress">Codigo de vestimenta...</span><br />
            <br>
            <i class="fas fa-user-tie"></i> <!-- Traje formal con corbata -->
            <i class="fas fa-female"></i> <!-- Representación de un vestido -->
            <br>
            <span class="dresscode">Etiqueta</span><br />
            <span class="text">*Se recomienda llevar abrigo*</span><br />
            
          </div>
          <div class="image-overlay"></div>
          <img src="/etiqueta.jpeg" alt="Etiqueta" class="date-image" />
        </div>
        
  
        <div class="itinerary-section">
          <p class="itinerary-title">Itinerario</p>
          <div class="itinerary-timeline">
            <!-- Misa -->
            <div class="itinerary-item">
              <div class="circle">
                <i class="fas fa-church"></i>
              </div>
              <div class="itinerary-text left">
                <span class="itinerary-event">Misa</span>
                <span class="itinerary-time">16:00 hrs</span>
              </div>
            </div>
            <!-- Civil -->
            <div class="itinerary-item">
              <div class="circle">
                <i class="fas fa-scroll"></i>
              </div>
              <div class="itinerary-text right">
                <span class="itinerary-event">Civil</span>
                <span class="itinerary-time">18:00 hrs</span>
              </div>
            </div>
            <!-- Cena -->
            <div class="itinerary-item">
              <div class="circle">
                <i class="fas fa-utensils"></i>
              </div>
              <div class="itinerary-text left">
                <span class="itinerary-event">Cena</span>
                <span class="itinerary-time">19:00 hrs</span>
              </div>
            </div>
            <!-- Semblanza -->
            <div class="itinerary-item">
              <div class="circle">
                <i class="fas fa-users"></i>
              </div>
              <div class="itinerary-text right">
                <span class="itinerary-event">Semblanza</span>
                <span class="itinerary-time">20:00 hrs</span>
              </div>
            </div>
            <div class="timeline-line"></div>
          </div>
        </div>
  
  
  
        <div class="locations-section">
          <p class="locations-title">Ubicaciones...</p>
          <div class="locations-container">
            <!-- Primera ubicación -->
            <div class="icons-ubi">
              <i class="fas fa-church"></i>
             </div>
            <div class="location-card">
              <img src="/iglesia.jpeg" alt="Iglesia" class="location-image" />
              <div class="location-info">
                <h3 class="location-name">Ceremonia Religiosa</h3>
                <p class="location-details">Iglesia Ejemplo<br />16:30 HORAS</p>
                <p class="location-address">
                  Calle ejemplo #33, Colonia Ejemplo, Ciudad Ejemplo, Estado Ejemplo, CP: 00000
                </p>
                <a href="https://maps.app.goo.gl/b2MKx28sLuK3AdyB6?g_st=ic" class="location-button">Ver en GPS</a>
              </div>
            </div>
  
            <!-- Segunda ubicación -->
             <div class="icons-ubi">
              <i class="fas fa-glass-cheers"></i>
             </div>
            <div class="location-card">
              <img src="/salon.jpeg" alt="Salón" class="location-image" />
              <div class="location-info">
                <h3 class="location-name">Recepción</h3>
                <p class="location-details">Iglesia Ejemplo<br />19:00 HORAS</p>
                <p class="location-address">
                  Calle ejemplo #33, Colonia Ejemplo, Ciudad Ejemplo, Estado Ejemplo, CP: 00000
                </p>
                <a href="https://maps.app.goo.gl/jF9MU6NVST2tPxX9A?g_st=com.google.maps.preview.copy" class="location-button">Ver en GPS</a>
              </div>
            </div>
          </div>
        </div>
  
        <div class="hotels-section">
        <!-- Pequeño recuadro -->
        <div class="confirmation-box" @click="goToRegister">
          <i class="fas fa-calendar-check"></i>
          <p class="confirmation-text">Favor de confirmar tu asistencia antes del:</p>
          <span class="confirmation-date">12</span><br />
          <span class="confirmation-date">AGOSTO</span><br />
          <span class="confirmation-date">2024</span>
        </div>

  
        <!-- Título de la sección -->
        <h2 class="hotels-title">Recomendación de hospedaje...</h2>
  
        <!-- Contenedor de hoteles -->
        <div class="hotels-container">
          <!-- Hotel 1 -->
          <div class="hotel-card">
            <img src="/hotel.jpg" alt="Hotel Ejemplo 1" class="hotel-image" />
            <div class="hotel-info">
              <h3 class="hotel-name">Hotel Ejemplo</h3>
              <a
                href="https://www.google.com/travel/hotels/s/zQ1coE3G8NEeuUjo7"
                target="_blank"
                class="hotel-button"
              >
                Ver info...
              </a>
            </div>
          </div>
  
          <!-- Hotel 2 -->
          <div class="hotel-card">
            <img src="/hotel2.jpeg" alt="Hotel Ejemplo 2" class="hotel-image" />
            <div class="hotel-info">
              <h3 class="hotel-name">Hotel Ejemplo</h3>
              <a
                href="https://maps.app.goo.gl/x5ULUene69MSsrzM6?g_st=com.google.maps.preview.copy"
                target="_blank"
                class="hotel-button"
              >
                Ver info...
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="countdown-section">
        <div class="countdown-box">
          <div class="icon-container">
            <i class="fas fa-calendar-alt"></i>
          </div>
          <p class="countdown-title">SERÁ EN:</p>
          <div class="countdown-timer">
            <div class="countdown-unit">
              <p class="countdown-number">{{ countdown.days }}</p>
              <p class="countdown-label">DÍAS</p>
            </div>
            <div class="countdown-unit">
              <p class="countdown-number">{{ countdown.hours }}</p>
              <p class="countdown-label">HORAS</p>
            </div>
            <div class="countdown-unit">
              <p class="countdown-number">{{ countdown.minutes }}</p>
              <p class="countdown-label">MINUTOS</p>
            </div>
            <div class="countdown-unit">
              <p class="countdown-number">{{ countdown.seconds }}</p>
              <p class="countdown-label">SEGUNDOS</p>
            </div>
          </div>
        </div>
        <div class="countdown-image">
        <img src="/novios2.jpeg" alt="Novios" />
        <!-- Texto decorativo -->
        <div class="text-overlay">
          <div class="names">
            <img src="/vj.png" alt="Novios" class="image" />
          </div>
          <!-- Texto descriptivo -->
          <div class="description">
            <p>
              Por lo importante que has sido en nuestras vidas, queremos que formes
              parte de este momento tan especial en donde nos unimos en sagrado
              matrimonio.
            </p>
          </div>
        </div>
        <!-- Bordes decorativos -->
      </div>
  
      </div>
  
        
     </div>
  </template>
  
  <script>
  import axios from "axios";
  import throttle from "lodash/throttle";
  import "@fortawesome/fontawesome-free/css/all.css";
  
  export default {
    props: {
      familyName: {
        type: String,
        required: true,
      },
      maxGuests: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        isPlaying: false,
        audioSrc: "/audio.mp3",
        currentTime: 0,
        duration: 0,
        progress: 0,
        isScrolling: false,
        showEtiqueta: false,
        countdown: {
          days: "00",
          hours: "00",
          minutes: "00",
          seconds: "00",
        },
      };
    },
    mounted() {
      const audio = this.$refs.audioPlayer;
  
      audio.play().catch((error) => {
        console.warn(
          "El usuario debe interactuar primero para reproducir el audio:",
          error
        );
      });
  
      window.addEventListener("scroll", this.updateTimeline);
      window.addEventListener("scroll", this.handleScroll);
      window.addEventListener("wheel", this.slowScroll, { passive: false });
  
      this.startCountdown();
    },
    beforeDestroy() {
      window.removeEventListener("scroll", this.handleScroll);
      window.removeEventListener("scroll", this.updateTimeline);
      window.removeEventListener("wheel", this.slowScroll);
    },
    methods: {
      handleScroll: throttle(function () {
        const scrollPosition = window.scrollY;
        const switchPoint = 2300;
  
        this.isScrolling = scrollPosition > 100;
  
        if (scrollPosition > switchPoint) {
          if (!this.showEtiqueta) {
            this.showEtiqueta = true;
          }
        } else {
          if (this.showEtiqueta) {
            this.showEtiqueta = false;
          }
        }
      }, 200),
      togglePlay() {
        const audio = this.$refs.audioPlayer;
        this.isPlaying ? audio.pause() : audio.play();
        this.isPlaying = !this.isPlaying;
      },
      updateProgress() {
        const audio = this.$refs.audioPlayer;
        this.currentTime = audio.currentTime;
        this.progress = (audio.currentTime / audio.duration) * 100;
      },
      seekAudio(event) {
        const audio = this.$refs.audioPlayer;
        const seekTime = (event.target.value / 100) * audio.duration;
        audio.currentTime = seekTime;
      },
      setDuration() {
        const audio = this.$refs.audioPlayer;
        this.duration = audio.duration;
      },
      formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
      },
      updateTimeline: throttle(function () {
        const timelineItems = document.querySelectorAll(".itinerary-item");
        const timelineLine = document.querySelector(".timeline-line");
  
        requestAnimationFrame(() => {
          timelineItems.forEach((item) => {
            const rect = item.getBoundingClientRect();
            const circle = item.querySelector(".circle");
  
            if (rect.top + rect.height / 2 < window.innerHeight / 2) {
              circle.classList.add("active");
            } else {
              circle.classList.remove("active");
            }
          });
  
          const activeCircles = document.querySelectorAll(".circle.active");
          if (activeCircles.length > 0) {
            const firstCircle = activeCircles[0];
            const lastCircle = activeCircles[activeCircles.length - 1];
            const timelineTop =
              firstCircle.getBoundingClientRect().top + window.scrollY;
            const timelineBottom =
              lastCircle.getBoundingClientRect().top +
              lastCircle.offsetHeight / 2 +
              window.scrollY;
  
            timelineLine.style.height = `${timelineBottom - timelineTop}px`;
          }
        });
      }, 100),
      slowScroll(event) {
        event.preventDefault();
        const delta = event.deltaY * 0.6;
        window.scrollBy({
          top: delta,
        });
      },
      startCountdown() {
        const targetDate = new Date("2025-02-22T16:00:00").getTime();
        setInterval(() => {
          const now = new Date().getTime();
          const timeLeft = targetDate - now;
  
          if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
              (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const minutes = Math.floor(
              (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
            );
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
            this.countdown = {
              days: days.toString().padStart(2, "0"),
              hours: hours.toString().padStart(2, "0"),
              minutes: minutes.toString().padStart(2, "0"),
              seconds: seconds.toString().padStart(2, "0"),
            };
          } else {
            this.countdown = {
              days: "00",
              hours: "00",
              minutes: "00",
              seconds: "00",
            };
          }
        }, 1000);
      },
      async goToRegister() {
        try {
          // Solicitar todas las invitaciones al backend
          const response = await axios.get("http://127.0.0.1:8000/api/invitations");
  
          // Verificar si la combinación de familyName y maxGuests existe
          const exists = response.data.some(
            (invitation) =>
              invitation.family_name === this.familyName &&
              invitation.max_guests === this.maxGuests
          );
  
          if (exists) {
            // Redirigir al registro de invitados si existe
            this.$router.push(
              `/register/${encodeURIComponent(this.familyName)}/${this.maxGuests}`
            );
          } else {
            // Mostrar alerta si no existe
            alert(
              "No se encontró una invitación con el nombre de familia y número de invitados proporcionados."
            );
          }
        } catch (error) {
          console.error("Error al verificar los datos:", error);
          alert("Hubo un error al verificar los datos. Inténtalo de nuevo.");
        }
      },
    },
  };
  </script>
  
  
  
  
  
  
  
  
  <style>
  /* Importar fuentes desde Google Fonts */
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');
  
  
  .icons-ubi
  {
    font-size: 2rem;
    color: #b76e79;
  }
  
  /* Fondo general */
  body {
    margin: 0;
    font-family: 'Times New Roman', Times, serif;
    overflow-x: hidden;
    
  }
  
  /* Contenedor principal */
  .invitation {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    background-color: #e3ecde;
    overflow-y: auto;
    min-height: 100vh;
  }
  /* Reproductor de audio */
  .audio-player {
    background-color: #e3ecde;
    text-align: center;
    width: 100vw;
    z-index: 2;
  }
  
  .audio-controls {
    margin-top: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
   
  }
  
  .play-button {
    background-color: #476d68;
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }
  
  .play-button:hover {
    background-color: #375450;
  }
  
  .progress-bar {
    width: 300px;
    height: 5px;
    background-color: #b19292;
    border-radius: 5px;
    appearance: none;
    cursor: pointer;
  }
  
  .progress-bar::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #4f4f4f;
    cursor: pointer;
  }
  
  .audio-title {
    font-family: "Playfair Display", serif;
    font-size: 1rem;
    color: #4f4f4f;
    margin-top: 10px;
  }
  
  /* Sección del título */
  .title-section {
    margin-bottom: 900px;
    width: 100%;
    position: relative;
    z-index: 2;
    background-color: #e3ecde;
  }
  
  /* Título elegante con espaciado */
  .title-principal {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.6rem;
    color: #b19292; /* Color más pálido */
    margin-bottom: 20px;
    text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.2);
  }
  
  
  
  /* Imagen principal */
  .image {
    max-width: 100%;
    height: auto;
    
  }
  
  /* Nombres de los novios */
  .names {
    font-family: 'Dancing Script', cursive;
    font-size: 1.8rem;
    color: #b19292; /* Color más pálido */
    margin-top: 10px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  
  /* Sección de la fecha */
  .date-section {
    position: fixed;
    width: 100%; /* Asegura que ocupe todo el ancho disponible */
    height: 100vh; /* Asegura que ocupe todo el alto disponible */
    background-attachment: fixed;
  }
  
  /* Filtro oscuro para la imagen */
  .image-overlay {
    position: absolute;
    top: 0;
    left: 50%;
    width: 100vw; /* 100% del ancho de la ventana */
    height: 100vh; /* 100% del alto de la ventana */
    object-fit: cover; /* Asegura que la imagen cubra todo el área disponible sin distorsión */
    margin: 0;
    background-color: rgba(0, 0, 0, 0.7); /* Filtro oscuro con transparencia */
    z-index: 1; /* Asegura que esté por encima de la imagen pero debajo del texto */
    transform: translateX(-50%); /* Ajusta para que el centro de la imagen esté alineado */
  }
  
  /* Imagen de la fecha */
  .date-image {
    position: absolute; /* Coloca la imagen en el fondo */
    top: 0;
    left: 50%; /* Centra la imagen horizontalmente */
    transform: translateX(-50%); /* Ajusta para que el centro de la imagen esté alineado */
    width: 100vw; /* 100% del ancho de la ventana */
    height: 100vh; /* 100% del alto de la ventana */
    object-fit: cover; /* Asegura que la imagen cubra todo el área disponible sin distorsión */
    margin: 0;
    z-index: 0; /* Coloca la imagen detrás del filtro y del texto */
  }
  
  /* Estilo del texto de la fecha */
  .date-text {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.2rem;
    color: #2f4f4f;
    margin-bottom: 10px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2; /* Asegura que el texto esté por encima de la imagen y del filtro */
  }
  
  .day {
    font-size: 1.5rem;
    color: #fff;
  }
  
  .day-number {
    font-size: 2.5rem;
    color: #b19292;
    font-weight: bold;
  }
  
  .month, .year, .time {
    font-size: 1.5rem;
    color: #fff;
  }
  
  .time {
    font-size: 2rem;
    color: #b19292;
    font-weight: bold;
  }
  
  
  
  .fathers-section {
    text-align: center;
    margin-top: 30px;
    z-index: 2;
    background-color: #e3ecde;
    width: 100vw; /* 100% del ancho de la ventana */
    height: 80vh; /* 100% del alto de la ventana */
  
  }
  .names-fathers
  {
    margin-top: 120px;
    
  }
  
  .title-fathers {
   
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.5rem;
    color: #2f4f4f;
    margin-bottom: 60px;
  }
  
  .parents-table {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
   
  }
  
  .parent-row {
    
    font-size: 1.2rem;
    
  }
  
  .label {
    font-family: 'Times New Roman', Times, serif;
    font-style: italic;
    color: #2f4f4f;
  }
  
  .names {
    font-family: 'Dancing Script', cursive;
    font-style: italic;
  }
  
  .godparents-section {
    text-align: center;
    margin-bottom: 900px;
    z-index: 2;
    width: 100vw;
    height: 80vh;
    display: flex;
    justify-content: center; /* Centra la card horizontalmente */
    align-items: center; /* Centra la card verticalmente */
    background-color: #e3ecde;
  }
  
  .godparents-card {
    position: relative;
    width: calc(100% - 40px); /* Tamaño dinámico con márgenes */
    max-width: 600px; /* Limita el ancho máximo */
    margin: 20px; /* Márgenes alrededor de la card */
    overflow: hidden; /* Oculta contenido fuera de los bordes */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Sombra sutil */
  }
  
  .godparents-image {
    width: 100%;
    height: auto;
    display: block;
  }
  
  .godparents-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5); /* Superposición oscura */
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: top;
    align-items: center;
    padding: 20px; /* Espaciado interno */
    box-sizing: border-box; /* Incluye el padding en el tamaño */
  }
  
  .title-godparents {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.8rem;
    color: #ffffff;
    margin-bottom: 120px;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5); /* Sombra para mejorar la legibilidad */
  }
  
  .godparents-table {
    text-align: center;
  }
  
  .godparents-row {
    font-family: 'Dancing Script', cursive;
    font-size: 1.2rem;
    color: #ffffff;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5); /* Sombra para mejorar la legibilidad */
    margin-left: 80px;
  }
  
  .dresscode-section {
    position: fixed;
    width: 100%; /* Asegura que ocupe todo el ancho disponible */
    height: 100vh; /* Asegura que ocupe todo el alto disponible */
    background-attachment: fixed;
   
  }
  
  /* Filtro oscuro para la imagen */
  .image-overlay {
    position: absolute;
    top: 0;
    left: 50%;
    width: 100vw; /* 100% del ancho de la ventana */
    height: 100vh; /* 100% del alto de la ventana */
    object-fit: cover; /* Asegura que la imagen cubra todo el área disponible sin distorsión */
    margin: 0;
    background-color: rgba(0, 0, 0, 0.7); /* Filtro oscuro con transparencia */
    z-index: 1; /* Asegura que esté por encima de la imagen pero debajo del texto */
    transform: translateX(-50%); /* Ajusta para que el centro de la imagen esté alineado */
  }
  
  /* Imagen de la fecha */
  .date-image {
    position: absolute; /* Coloca la imagen en el fondo */
    top: 0;
    left: 50%; /* Centra la imagen horizontalmente */
    transform: translateX(-50%); /* Ajusta para que el centro de la imagen esté alineado */
    width: 100vw; /* 100% del ancho de la ventana */
    height: 100vh; /* 100% del alto de la ventana */
    object-fit: cover; /* Asegura que la imagen cubra todo el área disponible sin distorsión */
    margin: 0;
    z-index: 0; /* Coloca la imagen detrás del filtro y del texto */
  }
  
  /* Estilo del texto de la fecha */
  .dresscode-text {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.6rem;
    color: #fff;
    margin-bottom: 10px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2; /* Asegura que el texto esté por encima de la imagen y del filtro */
  }
  
  .title-dresscode {
    font-size: 1.8rem;
    color: #fff;
    
  }
  
  .dresscode {
    font-size: 1.3rem;
    color: #fff;
    font-weight: bold;
    
  }
  
  
  
  .text {
    font-size: 1rem;
    color: #b19292;
    font-weight: bold;
  }
  /* Sección del Itinerario */
  .itinerary-section {
    text-align: center;
    background-color: #e3ecde;
    padding: 50px 0;
    position: relative;
    z-index: 2;
    width: 100vw; /* 100% del ancho de la ventana */
    height: 80vh; /* 100% del alto de la ventana */
  }
  
  .itinerary-title {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.8rem;
    color: #b19292;
    margin-bottom: 50px;
  }
  
  .itinerary-timeline {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  
  .itinerary-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 800px;
    margin: 40px 0;
  }
  
  .circle {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #b19292;
    border: 2px solid #fff;
    color: white;
    font-size: 1.5rem;
    transition: background-color 0.5s ease, border-color 0.5s ease;
    z-index: 2;
  }
  
  .circle i {
    pointer-events: none; /* Asegura que los íconos no sean interactivos */
    
  }
  
  .circle.active {
    background-color: #4f4f4f; /* Color activo */
    border-color: #4f4f4f;
  }
  
  
  .timeline-line {
    position: absolute;
    width: 4px;
    background-color: #b19292;
    top: 0;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    transition: height 0.5s ease, background-color 0.5s ease;
  }
  
  .timeline-line.active {
    background-color: #4f4f4f;
  }
  
  .itinerary-text {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    max-width: 300px;
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.2rem;
    color: #4f4f4f;
  }
  
  .itinerary-text.left {
    left: calc(50% - 100px); /* Texto a la izquierda */
    text-align: right;
  }
  
  .itinerary-text.right {
    left: calc(50% + 50px); /* Texto a la derecha */
    text-align: left;
  }
  
  .itinerary-time {
    display: block;
    font-size: 1rem;
    color: #b19292;
  
  
  }
  
  
  /* Sección de Ubicaciones */
  .locations-section {
    background-color: #e3ecde;
    text-align: center;
    z-index: 2;
    width: 100vw; /* 100% del ancho de la ventana */
    height: 220vh; /* 100% del alto de la ventana */
  }
  
  .locations-title {
    font-family: 'Times New Roman', Times, serif;
    font-size: 2rem;
    color: #b19292;
    margin-bottom: 40px;
  }
  
  .locations-container {
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    justify-content: center;
    
  }
  
  .location-card {
    background-color: #2f4f4f;
    color: white;
    overflow: hidden;
    width: 45%; /* Para pantallas grandes */
    max-width: 400px;
    text-align: left;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
    
  }
  
  .location-image {
    width: 100%;
    height: auto;
    display: block;
  }
  
  .location-info {
    padding: 20px;
  }
  
  .location-name {
    font-family: 'Dancing Script', cursive;
    font-size: 1.5rem;
    margin-bottom: 10px;
  }
  
  .location-details {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1rem;
    margin-bottom: 10px;
  }
  
  .location-address {
    font-family: 'Times New Roman', Times, serif;
    font-size: 0.9rem;
    color: #e3ecde;
    margin-bottom: 20px;
    border-top: 1px solid #e3ecde;
    padding-top: 10px;
  }
  
  .location-button {
    display: inline-block;
    background-color: #476d68;
    color: white;
    font-family: 'Times New Roman', Times, serif;
    font-size: 1rem;
    text-decoration: none;
    padding: 10px 20px;
    text-align: center;
    transition: background-color 0.3s ease;
  }
  
  .location-button:hover {
    background-color: #375450;
  }
  
  /* Responsividad */
  @media (max-width: 768px) {
    .locations-container {
      flex-direction: column;
      align-items: center;
    }
  
    .location-card {
      width: 90%; /* Ocupa toda la pantalla en pantallas pequeñas */
      max-width: none;
      align-self: center;
    }
  }
  
  /* Pequeño recuadro */
  .confirmation-box {
    background-color: #2f4f4f;
    color: white;
    text-align: center;
    padding: 20px;
    margin: 40px auto;
    max-width: 600px;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.7);
    position: relative;
    margin-bottom: 200px;
    
  }
  
  .confirmation-text {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.5rem;
    margin-bottom: 50px;
  }
  
  .confirmation-date {
    font-family: 'Times New Roman', Times, serif;
    font-size: 2rem;
    color: #b19292;;
  }
  
  /* Sección de hoteles */
  .hotels-section {
    background-color: #e3ecde;
  
    text-align: center;
    z-index: 2;
    width: 100vw; /* 100% del ancho de la ventana */
    height: 200vh; /* 100% del alto de la ventana */
  }
  
  .hotels-title {
    font-family: 'Dancing Script', cursive;
    font-size: 2rem;
    color: #b19292;
    margin-bottom: 40px;
  }
  
  .hotels-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
  }
  
  .hotel-card {
    background-color: white;
    overflow: hidden;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
    width: 45%; /* Para dos tarjetas en pantallas grandes */
    max-width: 400px;
    text-align: center;
    display: flex;
    flex-direction: column;
  }
  
  .hotel-image {
    width: 100%;
    height: auto;
    display: block;
  }
  
  .hotel-info {
    padding: 20px;
  }
  
  .hotel-name {
    font-family: 'Dancing Script', cursive;
    font-size: 1.5rem;
    margin-bottom: 10px;
  }
  
  .hotel-button {
    display: inline-block;
    background-color: #476d68;
    color: white;
    font-family: 'Times New Roman', Times, serif;
    font-size: 1rem;
    text-decoration: none;
    padding: 10px 20px;
    margin-top: 10px;
    transition: background-color 0.3s ease;
  }
  
  .hotel-button:hover {
    background-color: #375450;
  }
  
  /* Responsividad */
  @media (max-width: 768px) {
    .hotels-container {
      flex-direction: column;
      gap: 20px;
    }
  
    .hotel-card {
  
      width: 90%; /* Ocupa toda la pantalla en pantallas pequeñas */
      max-width: none;
      align-self: center;
    }
    .confirmation-box
    {
      width: 65%; /* Ocupa toda la pantalla en pantallas pequeñas */
      max-width: none;
      align-self: center;
    }
  }
  
  
  .countdown-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #e3ecde;
    width: 100vw; /* 100% del ancho de la ventana */
    height: 120vh; /* 100% del alto de la ventana */
    text-align: center;
    z-index: 2;
  }
  
  .countdown-box {
    background-color: #2f4f4f;
    color: white;
    padding: 20px;
    max-width: 400px;
    width: 80%;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.7);
    margin-bottom: 100px;
  }
  
  .icon-container {
    text-align: center;
    margin-bottom: 20px;
  }
  
  .icon-container i {
    font-size: 2rem;
    color: #e3ecde;
  }
  
  .countdown-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    margin-bottom: 20px;
    letter-spacing: 0.1em;
  }
  
  .countdown-timer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .countdown-unit {
    text-align: center;
  }
  
  .countdown-number {
    font-size: 2rem;
    font-family: 'Playfair Display', serif;
    color: #e3ecde;
  }
  
  .countdown-label {
    font-size: 1rem;
    font-family: 'Playfair Display', serif;
    color: #b19292;
  }
  
  .countdown-image {
    position: relative;
    width: 100%;
    max-width: 500px;
    margin: auto;
    overflow: hidden;
  }
  
  .countdown-image img {
    width: 100%;
    height: auto;
  }
  
  .text-overlay {
    position: absolute;
    top: 350px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    text-align: center;
    color: white;
   
  }
  
  
  
  .description {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.1rem;
    color: #fff;
    
  }
  
  
  </style>
  