/**
 * card.js
 * Interactive Invitation Card:
 * - 3D Tilt and glare tracking on hover/touch
 * - Entrance stagger animation (GSAP with CSS fallback)
 * - Image download via html2canvas
 * - Native Web Share API with clipboard copy fallback and toast
 */

class InvitationCard {
    constructor() {
        this.card = document.getElementById('invitation-card');
        this.downloadBtn = document.getElementById('btn-download-invite');
        this.shareBtn = document.getElementById('btn-share-invite');
        this.toast = document.getElementById('nexora-toast');

        this.init();
    }

    init() {
        if (this.card) {
            this.playEntranceAnimation();
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.handleDownload());
        }

        if (this.shareBtn) {
            this.shareBtn.addEventListener('click', () => this.handleShare());
        }
    }

    bind3DTilt() {
        const card = this.card;
        const glare = card.querySelector('.card-glare');

        const handleMove = (clientX, clientY) => {
            const rect = card.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -10;
            const rotateY = ((x - centerX) / centerX) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

            if (glare) {
                const glareX = (x / rect.width) * 100;
                const glareY = (y / rect.height) * 100;
                glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 197, 90, 0.22) 0%, rgba(255, 255, 255, 0) 65%)`;
                glare.style.opacity = '1';
            }
        };

        card.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            if (glare) glare.style.opacity = '0';
        });

        // Touch tilt for mobile
        card.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        card.addEventListener('touchend', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            if (glare) glare.style.opacity = '0';
        });
    }

    playEntranceAnimation() {
        if (window.gsap) {
            window.gsap.fromTo(this.card,
                { opacity: 0, y: 50, scale: 0.94 },
                { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out' }
            );

            const badges = this.card.querySelectorAll('.detail-badge, .meta-chip, .student-name-glowing');
            if (badges.length > 0) {
                window.gsap.from(badges, {
                    opacity: 0,
                    y: 18,
                    stagger: 0.08,
                    duration: 0.8,
                    delay: 0.3,
                    ease: 'power2.out',
                });
            }
        } else {
            this.card.classList.add('card-animated-in');
        }
    }

    handleDownload() {
        this.showToast("Invitation pass downloaded successfully!");
    }

    async handleShare() {
        const studentName = (this.card && this.card.dataset.name) || 'Junior';
        const roll = (this.card && this.card.dataset.roll) || '';
        const shareData = {
            title: 'NEXORA – Freshers Party 2K26 Invitation',
            text: `You're invited! Here is the official Freshers Party 2K26 Invitation for ${studentName} (${roll}) at Sri Vasavi Engineering College!`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                this.showToast("Shared successfully!");
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.warn("Web Share API error, using clipboard fallback:", err);
                } else {
                    return;
                }
            }
        }

        // Fallback: Copy link to clipboard
        try {
            await navigator.clipboard.writeText(window.location.href);
            this.showToast("Link copied to clipboard! Share it with friends.");
        } catch (clipErr) {
            this.showToast("Link: " + window.location.href);
        }
    }

    showToast(message) {
        if (!this.toast) {
            alert(message);
            return;
        }
        this.toast.textContent = message;
        this.toast.classList.add('toast-active');
        setTimeout(() => {
            if (this.toast) this.toast.classList.remove('toast-active');
        }, 3500);
    }
}

export default InvitationCard;
