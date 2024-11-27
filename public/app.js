const burger = document.querySelector('#burger');
const menu = document.querySelector('#menu');

burger.addEventListener('click', () => {
    menu.classList.toggle('disp');
});
document.querySelectorAll('.QQ').forEach(img => {
    img.addEventListener('click', function() {
       
        window.open('style/Images/22.jpg');
    });
});
document.querySelectorAll('.QQ1').forEach(img => {
    img.addEventListener('click', function() {
       
        window.open('style/Images/11.jpg');
    });
});
document.querySelectorAll('.QQ2').forEach(img => {
    img.addEventListener('click', function() {
       
        window.open('style/Images/33.jpg');
    });
});