<template>
  <div class="generate-link">
    <h1>Generar Invitación</h1>
    <form @submit.prevent="generateLink">
      <div>
        <label for="familyName">Nombre de la familia:</label>
        <input
          type="text"
          id="familyName"
          v-model="familyName"
          placeholder="Introduce el nombre de la familia"
          required
        />
      </div>
      <div>
        <label for="numGuests">Número de invitados:</label>
        <input
          type="number"
          id="numGuests"
          v-model.number="numGuests"
          placeholder="Introduce el número de invitados"
          required
          min="1"
        />
      </div>
      <button type="submit" :disabled="isLoading">
        <span v-if="isLoading">Generando...</span>
        <span v-else>Generar Link</span>
      </button>
    </form>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-if="generatedLink" class="generated-link">
      <p>¡Enlace generado exitosamente! Puedes copiarlo:</p>
      <div class="link-container">
        <input
          type="text"
          :value="generatedLink"
          readonly
          @click="copyLink"
          ref="linkInput"
        />
        <button @click="copyLink">Copiar</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      familyName: "",
      numGuests: 0,
      isLoading: false,
      errorMessage: null,
      generatedLink: null, // Almacena el enlace generado
    };
  },
  methods: {
    async generateLink() {
      // Reiniciar mensajes de error y éxito
      this.errorMessage = null;
      this.generatedLink = null;

      if (!this.familyName || !this.numGuests) {
        this.errorMessage = "Por favor completa todos los campos.";
        return;
      }

      this.isLoading = true; // Inicia el indicador de carga

      try {
        // Realiza la solicitud POST al backend
        const response = await axios.post("http://127.0.0.1:8000/api/invitations", {
          family_name: this.familyName,
          max_guests: this.numGuests,
        });

        // Enlace generado por el backend
        this.generatedLink = response.data.link;
      } catch (error) {
        console.error("Error al generar el enlace:", error);
        this.errorMessage = "Hubo un problema al generar el enlace. Inténtalo de nuevo.";
      } finally {
        this.isLoading = false; // Detener el indicador de carga
      }
    },
    copyLink() {
      // Seleccionar y copiar el enlace al portapapeles
      const linkInput = this.$refs.linkInput;
      linkInput.select();
      document.execCommand("copy");
      alert("¡Enlace copiado al portapapeles!");
    },
  },
};
</script>

<style scoped>
/* Contenedor principal */
.generate-link {
  background-color: #e3ecde; /* Fondo principal */
  color: #476d68; /* Color del texto principal */
  padding: 20px;
  border-radius: 8px;
  max-width: 400px;
  margin: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Sombra para dar relieve */
  font-family: "Times New Roman", Times, serif;
  text-align: center;
}

/* Título */
h1 {
  color: #b19292; /* Color de los títulos */
  font-size: 29px;
  margin-bottom: 20px;
}

/* Formularios */
form {
  display: flex;
  flex-direction: column;
  gap: 15px; /* Espaciado entre campos */
}

label {
  color: #b19292; /* Color de las etiquetas */
  font-weight: bold;
}

input {
  padding: 10px;
  border: 2px solid #b19292; /* Borde del input */
  border-radius: 5px;
  font-size: 14px;
  background-color: #ffffff; /* Fondo blanco */
  color: #476d68; /* Texto en los inputs */
}

input:focus {
  outline: none;
  border-color: #476d68; /* Color del borde al enfocar */
  box-shadow: 0 0 5px rgba(71, 109, 104, 0.5);
}

/* Botón */
button {
  background-color: #476d68; /* Fondo del botón */
  color: #ffffff; /* Texto del botón */
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

button:disabled {
  background-color: #a3b1ad; /* Color deshabilitado */
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: #3b5958; /* Color al pasar el mouse */
}

/* Mensajes */
.error-message {
  margin-top: 20px;
  color: #b19292; /* Color del error */
  font-size: 14px;
}

.generated-link {
  margin-top: 20px;
  color: #476d68;
  text-align: center;
}

.link-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.link-container input {
  padding: 10px;
  font-size: 14px;
  border: 1px solid #b19292;
  border-radius: 5px;
  width: 70%;
}

.link-container button {
  background-color: #476d68;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.link-container button:hover {
  background-color: #3b5958;
}
</style>
