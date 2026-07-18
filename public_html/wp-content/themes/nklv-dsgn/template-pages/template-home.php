<?php 
/*
Template Name: Main page
*/

get_header();
?>

  <div class = "container">
        <div class = "logo">
            <a href = "/">
                <img src = "<?php echo get_template_directory_uri(). '/assets/img/nklv.dsgn.svg'?>">
            
            </a>
        </div>

        <div class = "menu">
            <ul>
                <li><a href = "https://www.behance.net/oleg_nikolaev1" target = "_blank">Portfolio</a></li>
                <li><a href = "https://medium.com/@nikolaev.design1" target = "_blank">Media</a></li>
                <li><a href = "mailto:nikolaev.design1@gmail.com">Email</a></li>
                <li><a href = "https://api.whatsapp.com/send/?phone=40747283995" target = "_blank">WhatsApp</a></li>
            </ul>
        </div>
        <div class="service-labels">
            <p>UX + UI</p>
            <p>Branding<br>Websites<br>Services<br>Mobile Apps</p>
        </div>
        <div class = "main-content">
            <div class = "projects_icons">
                <img src = "<?php echo get_template_directory_uri(). '/assets/img/icon3.png'?>" data-index="0">
                <img src = "<?php echo get_template_directory_uri(). '/assets/img/icon4.png'?>" data-index="1">
                <img src = "<?php echo get_template_directory_uri(). '/assets/img/icon5.png'?>" data-index="2">
                <img src = "<?php echo get_template_directory_uri(). '/assets/img/icon6.png'?>" data-index="3">
            </div>
			<div class = "main-content_buttons">
				<div class = "main-content-button">Let's talk</div>
				<a href = '/calc.html' class = "main-content-button" target = "_blank">Calculate price</a>
			</div>
        </div>
        
        <div class = "sub">
            <p>Since 2018</p>
        </div>
        <div class="mobile-bottom-bar">
            <div class="mobile-menu-btn">Menu</div>
            <div class="mobile-talk-btn">Let's talk</div>
        </div>
    </div>
    <div class = "projects-videos">
        <video class="project-video" data-index="0" src="<?php echo get_template_directory_uri(). '/assets/img/video1.mp4'?>" loop muted playsinline></video>
        <video class="project-video" data-index="1" src="<?php echo get_template_directory_uri(). '/assets/img/video2.mp4'?>" loop muted playsinline></video>
        <video class="project-video" data-index="2" src="<?php echo get_template_directory_uri(). '/assets/img/video3.mp4'?>" loop muted playsinline></video>
        <video class="project-video" data-index="3" src="<?php echo get_template_directory_uri(). '/assets/img/video4.mp4'?>" loop muted playsinline></video>
    </div>
    <div class = "contant-popup">
        <div class = "contact-popup-background"></div>
        <div class = "contact-popup-close">
            <div class="contact-popup-close-burger"></div>
        </div>
        <div class = "contact-form">
            <div class = "container">
                <h1>Let’s discuss your ideas</h1>
                <p>You can fill in the form and our manager will contact you soon or write us in <a href = "https://api.whatsapp.com/send/?phone=40747283995" target = "_blank">WhatsApp</a></p>
                <form>
                    <div class = "form_flex">
                        <div class = "input_area">
                            <input type="text" name="user_name" placeholder="Your name" required>
                            <input type="text" name="company" placeholder="I’m from company">
                            <input type="email" name="user_email" placeholder="E-mail" required>
                        </div>
                        <div class = "input_textarea">
                            <textarea name="message" placeholder="I would like to create" required></textarea>
                        </div>
                    </div>
                   <div class = "input_checkbox">
                        <input type = "checkbox" name="consent" required>
                        <p>By clicking the button, I consent to the processing of personal data and agree to the terms of the privacy policy.</p>
                   </div>
                   <button>Send form</button>
                </form>
            </div>
            <div class="form-success">
                <h2>Thanks for<br>your message!</h2>
                <p>Our manager will contact you soon.</p>
                <div class="form-success-btn">Close</div>
            </div>
            <div class="form-footer">
                <div class="form-footer-contacts">
                    <span>+40 747 283 994</span>
                    <span>nikolaev.design1@gmail.com</span>
                </div>
                <a href="#">Privacy policy</a>
            </div>
        </div>
    </div>
    <div class="mobile-menu-overlay">
        <div class="mobile-menu-close">
            <div class="contact-popup-close-burger"></div>
        </div>
        <ul>
            <li><a href="https://www.behance.net/oleg_nikolaev1" target="_blank">Portfolio</a></li>
            <li><a href="https://medium.com/@nikolaev.design1" target="_blank">Media</a></li>
            <li><a href="mailto:nikolaev.design1@gmail.com">Email</a></li>
            <li><a href="https://api.whatsapp.com/send/?phone=40747283995" target="_blank">WhatsApp</a></li>
            <li><a href="calc.html" target="_blank">Calculate price</a></li>
        </ul>
    </div>
<script src = "https://code.jquery.com/jquery-4.0.0.slim.min.js"></script>
    <script src="<?php echo get_template_directory_uri() . '/assets/js/main.js'?>"></script>
<?php 

get_footer();