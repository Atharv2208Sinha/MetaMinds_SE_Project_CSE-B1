let slideIndex = 1;
let slideTimer;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Login State and Modify Title
    const token = localStorage.getItem('token');
    if (token) {
        document.title = "Home / About";
    }

    // 2. Initialize Slideshow
    showSlides(slideIndex);
});

// Manual Slideshow Controls
function plusSlides(n) {
    clearTimeout(slideTimer); // Reset auto-timer on manual interaction
    showSlides(slideIndex += n);
}

// Thumbnail/Dot image controls
function currentSlide(n) {
    clearTimeout(slideTimer); // Reset auto-timer on manual interaction
    showSlides(slideIndex = n);
}

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("mySlides");
    let dots = document.getElementsByClassName("dot");
    
    if (n > slides.length) { slideIndex = 1 }
    if (n < 1) { slideIndex = slides.length }
    
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    
    // Safety check in case the images haven't loaded perfectly yet
    if (slides[slideIndex - 1]) {
        slides[slideIndex - 1].style.display = "block";
        dots[slideIndex - 1].className += " active";
    }

    // Auto-advance slides every 5 seconds
    slideTimer = setTimeout(() => { plusSlides(1); }, 5000); 
}