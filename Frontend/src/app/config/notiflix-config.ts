import Notiflix from 'notiflix';

export const configurarNotiflix = (): void => {
  Notiflix.Confirm.init({
    className: 'notiflix-confirm',
    titleColor: '#1a202c', // Color del título (gris oscuro)
    titleFontSize: '30px', // Tamaño del título
    messageColor: '#4a5568', // Color del mensaje (gris suave)
    messageFontSize: '16px', // Tamaño del mensaje
    backgroundColor: '#ffffff', // Fondo blanco puro
    borderRadius: '12px', // Bordes redondeados suaves
    fontFamily: 'Quicksand',
    backOverlay: true, // Habilitar superposición de fondo
    backOverlayColor: 'rgba(0, 0, 0, 0.3)', // Fondo oscuro con opacidad
    okButtonBackground: '#2563eb', // Azul moderno para botón OK
    okButtonColor: '#ffffff', // Texto blanco en el botón OK
    cancelButtonBackground: '#e5e7eb', // Gris claro para botón Cancelar
    cancelButtonColor: '#374151', // Texto gris oscuro en botón Cancelar
    buttonsFontSize: '14px', // Tamaño uniforme de los botones
    width: '420px', // Ancho del modal
    zindex: 9999, // Asegurar que esté por encima de otros elementos
    cssAnimationStyle: 'zoom', // Animación suave de aparición,

  });
};
