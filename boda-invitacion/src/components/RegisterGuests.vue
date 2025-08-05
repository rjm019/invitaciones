<template>
  <div class="register-guests">
    <h1>Registrar Invitados para la Familia {{ familyName }}</h1>
    <div v-if="!canGeneratePasses">
      <p class="info-message">
        Ya has creado todos los pases disponibles para esta invitación.
      </p>
    </div>
    <form v-else @submit.prevent="confirmGuests">
      <div v-for="(guest, index) in guests" :key="index" class="guest-input">
        <input
          type="text"
          v-model="guest.firstName"
          placeholder="Nombre"
          required
        />
        <input
          type="text"
          v-model="guest.lastName"
          placeholder="Apellido"
          required
        />
      </div>
      <button type="submit" :disabled="isLoading">
        <span v-if="isLoading">Registrando...</span>
        <span v-else>Confirmar</span>
      </button>
    </form>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
  </div>
</template>

<script>
import axios from "axios";

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
      guests: Array.from({ length: this.maxGuests }, () => ({
        firstName: "",
        lastName: "",
      })),
      isLoading: false,
      errorMessage: null,
      successMessage: null,
      canGeneratePasses: true, // Nueva propiedad para controlar si se pueden generar pases
    };
  },
  async mounted() {
    try {
      // Obtener el ID de la invitación
      const invitationResponse = await axios.get(
        `http://127.0.0.1:8000/api/invitations`
      );
      const invitation = invitationResponse.data.find(
        (inv) =>
          inv.family_name === this.familyName &&
          inv.max_guests === this.maxGuests
      );

      if (!invitation) {
        this.errorMessage =
          "No se encontró la invitación correspondiente. Verifica los datos.";
        this.canGeneratePasses = false;
        return;
      }

      // Verificar si se pueden generar más pases
      const canGenerateResponse = await axios.get(
        `http://127.0.0.1:8000/api/invitations/${invitation.id}/can-generate`
      );

      if (!canGenerateResponse.data.canGenerate) {
        this.errorMessage = canGenerateResponse.data.message;
        this.canGeneratePasses = false;
      }
    } catch (error) {
      console.error("Error al verificar los pases:", error);
      this.errorMessage =
        "Hubo un error al verificar los pases. Inténtalo de nuevo.";
      this.canGeneratePasses = false;
    }
  },
  methods: {
    async confirmGuests() {
      const filledGuests = this.guests.filter(
        (guest) => guest.firstName.trim() && guest.lastName.trim()
      );
      if (filledGuests.length !== this.maxGuests) {
        alert(
          `Solo se están registrando ${filledGuests.length} de ${this.maxGuests} invitados`
        );
        return;
      }

      this.isLoading = true;
      this.errorMessage = null;
      this.successMessage = null;

      try {
        // Obtener el ID de la invitación desde el backend
        const invitationResponse = await axios.get(
          `http://127.0.0.1:8000/api/invitations`
        );

        const invitation = invitationResponse.data.find(
          (inv) =>
            inv.family_name === this.familyName &&
            inv.max_guests === this.maxGuests
        );

        if (!invitation) {
          this.errorMessage =
            "No se encontró la invitación correspondiente. Verifica los datos.";
          return;
        }

        // Enviar invitados al backend
        await axios.post(
          `http://127.0.0.1:8000/api/invitations/${invitation.id}/guests`,
          {
            guests: this.guests.map((guest) => ({
              first_name: guest.firstName,
              last_name: guest.lastName,
            })),
          }
        );

        this.successMessage = "Invitados registrados correctamente.";
        this.guests = Array.from({ length: this.maxGuests }, () => ({
          firstName: "",
          lastName: "",
        }));

        // Redirigir al endpoint del PDF después de un registro exitoso
        window.open(
          `http://127.0.0.1:8000/api/invitations/${invitation.id}/guests/pdf`,
          "_blank"
        );
      } catch (error) {
        console.error("Error al registrar los invitados:", error);
        this.errorMessage =
          "Hubo un error al registrar los invitados. Inténtalo de nuevo.";
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.register-guests {
  background-color: #e3ecde;
  color: #476d68;
  padding: 20px;
  border-radius: 8px;
  max-width: 600px;
  margin: auto;
}
.guest-input {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
button {
  background-color: #476d68;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}
button:disabled {
  background-color: #a3b1ad;
  cursor: not-allowed;
}
button:hover:not(:disabled) {
  background-color: #3c5b59;
}
.error-message {
  color: #b19292;
  margin-top: 20px;
}
.success-message {
  color: #476d68;
  margin-top: 20px;
}
.info-message {
  color: #476d68;
  margin-top: 20px;
  font-weight: bold;
}
</style>
