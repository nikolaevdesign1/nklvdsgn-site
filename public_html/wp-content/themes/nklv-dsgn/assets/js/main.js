// WordPress AJAX form submission

const popup = document.querySelector('.contant-popup');
const openBtn = document.querySelector('.main-content-button');
const closeBtn = document.querySelector('.contact-popup-close');
const bgOverlay = document.querySelector('.contact-popup-background');

openBtn.addEventListener('click', () => popup.classList.add('active'));
closeBtn.addEventListener('click', () => popup.classList.remove('active'));
bgOverlay.addEventListener('click', () => popup.classList.remove('active'));

const mobileTalkBtn = document.querySelector('.mobile-talk-btn');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');

if (mobileTalkBtn) {
    mobileTalkBtn.addEventListener('click', () => popup.classList.add('active'));
}
const mobileMenuClose = document.querySelector('.mobile-menu-close');
const mobileContactsLink = document.querySelector('.mobile-contacts-link');

if (mobileMenuBtn && mobileMenuOverlay) {
    mobileMenuBtn.addEventListener('click', () => mobileMenuOverlay.classList.toggle('active'));
    mobileMenuOverlay.addEventListener('click', (e) => {
        if (e.target === mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    });
}
if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', () => mobileMenuOverlay.classList.remove('active'));
}
if (mobileContactsLink) {
    mobileContactsLink.addEventListener('click', (e) => {
        e.preventDefault();
        mobileMenuOverlay.classList.remove('active');
        popup.classList.add('active');
    });
}

const contactForm = document.querySelector('.contact-form form');
const formSuccess = document.querySelector('.form-success');
const formSuccessBtn = document.querySelector('.form-success-btn');
const sendBtn = document.querySelector('.contact-form button');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    const data = new FormData();
    data.append('action', 'send_contact');
    data.append('nonce', nklv.nonce);
    data.append('user_name',  contactForm.querySelector('[name="user_name"]').value);
    data.append('company',    contactForm.querySelector('[name="company"]').value);
    data.append('user_email', contactForm.querySelector('[name="user_email"]').value);
    data.append('message',    contactForm.querySelector('[name="message"]').value);

    fetch(nklv.ajax_url, { method: 'POST', body: data })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                formSuccess.classList.add('active');
                contactForm.reset();
            } else {
                alert('Something went wrong. Please try again.');
            }
        })
        .catch(() => alert('Network error. Please try again.'))
        .finally(() => {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send form';
        });
});

formSuccessBtn.addEventListener('click', () => {
    formSuccess.classList.remove('active');
    popup.classList.remove('active');
});

const icons = document.querySelectorAll('.projects_icons img');
const videos = document.querySelectorAll('.project-video');

icons.forEach(icon => {
    icon.addEventListener('click', () => {
        const index = icon.dataset.index;

        // Деактивируем все видео
        videos.forEach(v => {
            v.classList.remove('active');
            v.pause();
        });

        // Показываем нужное видео
        const targetVideo = document.querySelector(`.project-video[data-index="${index}"]`);
        targetVideo.classList.add('active');
        targetVideo.play();

        // Обновляем состояние иконок
        icons.forEach(img => img.classList.add('inactive'));
        icon.classList.remove('inactive');
    });
});
