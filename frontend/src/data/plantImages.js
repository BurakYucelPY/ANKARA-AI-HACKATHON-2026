// Bitki türleri ve görsel yolları
// Yerel assets klasöründen

// Görsel importları
import domatesImg from '../assets/images/plant_image/domates.jpg';
import bugdayImg from '../assets/images/plant_image/bugday.jpg';
import misirImg from '../assets/images/plant_image/mısır.jpg';
import aycicekImg from '../assets/images/plant_image/aycicek.jpg';
import biberImg from '../assets/images/plant_image/biber.jpg';
import patatesImg from '../assets/images/plant_image/patates.jpg';
import soganImg from '../assets/images/plant_image/sogan.jpg';
import cilekImg from '../assets/images/plant_image/cilek.jpg';

const plantImages = {
    "Domates": {
        image: domatesImg,
        color: "#dc2626"
    },
    "Buğday": {
        image: bugdayImg,
        color: "#ca8a04"
    },
    "Mısır": {
        image: misirImg,
        color: "#eab308"
    },
    "Ayçiçeği": {
        image: aycicekImg,
        color: "#f59e0b"
    },
    "Kapya Biber": {
        image: biberImg,
        color: "#ef4444"
    },
    "Patates": {
        image: patatesImg,
        color: "#a16207"
    },
    "Soğan": {
        image: soganImg,
        color: "#7c3aed"
    },
    "Çilek": {
        image: cilekImg,
        color: "#e11d48"
    },
    // Varsayılan
    "default": {
        image: bugdayImg,
        color: "#22c55e"
    }
};

export const getPlantImage = (plantName) => {
    return plantImages[plantName] || plantImages["default"];
};

export default plantImages;
