let register = document.getElementsByClassName("register");
let log_in = document.getElementsByClassName("log-in");
let to_register = document.getElementById("to_register");
let to_log_in = document.getElementById("to_log_in");
const body = document.querySelector("body");
const topImg = document.getElementById("topImg");
const createPost = document.getElementById("createPost");
const centerHome = document.getElementById("centerHome");
const loginRequiredOverlay = document.getElementById("login-required-overlay");
let isUserLoggedIn = false;

if (to_log_in) {
  to_log_in.addEventListener("click", () => {
    switchtologin();
  });
}

if (to_register) {
  to_register.addEventListener("click", () => {
    log_in[0].style.display = "none";
    log_in[1].style.display = "none";
    register[0].style.display = "flex";
    register[1].style.display = "flex";
  });
}

document.querySelector(".btnNotify").addEventListener("click", switchtologin)

function switchtologin() {
  register[0].style.display = "none";
  register[1].style.display = "none";
  log_in[0].style.display = "flex";
  log_in[1].style.display = "flex";
}


function showCheckboxes(c) {
  const event = window.event;
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const checkboxes = document.getElementById(c);
  checkboxes.classList.toggle("none");

  // Add click outside listener
  if (!checkboxes.classList.contains("none")) {
    setTimeout(() => {
      document.addEventListener('click', function closeCheckboxes(e) {
        if (!checkboxes.contains(e.target) && !e.target.closest('.selectBox')) {
          checkboxes.classList.add("none");
          document.removeEventListener('click', closeCheckboxes);
        }
      });
    }, 0);
  }
}

function toggleCateg() {
  document.getElementById("uparrow").classList.toggle("none");
  document.getElementById("downarrow").classList.toggle("none");
  document.getElementById("filterCategContent").classList.toggle("none");
}

// Check login status and show login overlay if not logged in
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/is-logged-in');
        const data = await response.json();
        
        isUserLoggedIn = data && data.loggedIn === true;
        
        if (!isUserLoggedIn) {
            // Show login required overlay
            if (loginRequiredOverlay) {
                loginRequiredOverlay.classList.remove('none');
            }
            
            // Completely remove any existing posts content
            if (centerHome) {
                centerHome.classList.add('hidden');
                centerHome.innerHTML = ''; // Clear any existing posts content
            }
            
            // Force login popup to appear and prevent it from being closed
            const popBackground = document.getElementById('popBackgroundLogin');
            const popCreate = document.getElementById('popCreateLogin');
            
            if (popBackground && popCreate) {
                // Show the login popup
                popBackground.classList.remove('none');
                popCreate.classList.remove('none');
                document.body.style.overflow = 'hidden';
                
                // Set high z-index
                popBackground.style.zIndex = '2000';
                popCreate.style.zIndex = '2001';
                
                // Prevent closing by clicking outside
                popBackground.onclick = function(e) {
                    e.stopPropagation();
                    return false;
                };
            }
        } else {
            // User is logged in, hide overlay and show content
            if (loginRequiredOverlay) {
                loginRequiredOverlay.classList.add('none');
            }
            
            if (centerHome) {
                centerHome.classList.remove('hidden');
            }
        }
        
        return isUserLoggedIn;
    } catch (error) {
        console.error('Error checking login status:', error);
        return false;
    }
}

function toggleMenu(back, create) {
    const backElement = document.getElementById(back);
    const createElement = document.getElementById(create);
    
    if (backElement && createElement) {
        if (createElement.classList.contains('none')) {
            // Show popup
            backElement.classList.remove('none');
            createElement.classList.remove('none');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            
            // Ensure proper z-index for login popup
            if (back === 'popBackgroundLogin') {
                backElement.style.zIndex = '1500';
                createElement.style.zIndex = '1501';
                
                // For login popup, prevent closing by clicking outside if user is not logged in
                if (!isUserLoggedIn) {
                    backElement.onclick = function(e) {
                        // Prevent event bubbling and closing
                        e.stopPropagation();
                        return false;
                    };
                }
            }
            
            // Reset form fields if showing login popup
            if (create === 'popCreateLogin') {
                const inputs = createElement.querySelectorAll('input[type="text"], input[type="password"], input[type="email"]');
                inputs.forEach(input => input.value = '');
            }
        } else {
            // Only allow hiding the login popup if user is logged in
            if ((back === 'popBackgroundLogin' && isUserLoggedIn) || back !== 'popBackgroundLogin') {
                // Hide with animation
                createElement.classList.add('hiding');
                backElement.classList.add('hiding');
                
                // Remove elements after animation
                setTimeout(() => {
                    createElement.classList.remove('hiding');
                    backElement.classList.remove('hiding');
                    createElement.classList.add('none');
                    backElement.classList.add('none');
                    document.body.style.overflow = ''; // Restore scroll
                }, 200);
            }
        }
    }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAlert(passIntAlert) {
  let alertElernt = document.createElement("alert");
  alertElernt.innerHTML = passIntAlert;
  body.appendChild(alertElernt);
}

function removeAlert() {
  const newAlert = document.querySelector("alert");
  newAlert?.remove();
}

const alert = (clas, message) => {
  // auto remove
  removeAlert();
  setTimeout(() => {
    const newAlert = document.querySelector("alert");
    if (newAlert) {
      removeAlert();
    }
  }, 3000);

  return `<div class="alert">
      <div class="alert-container">
        <div class="alert-content ${clas}">
          <div class="alert-header">
            <span class="alert-message">${message}</span>
            <span class="btnAlert btn-close" onclick="removeAlert()">x</span>
          </div>
        </div>
      </div>
    </div>`;
};


function dangerError(status) {
  let err = "";
  if (status === 500) {
    err = errTemplate(500, "Internal Server Error");
  } else if (status === 400) {
    err = errTemplate(400, "Bad Request ");
  }
  if (err != "") document.body.innerHTML = err;
}

const errTemplate = (code, message) => {
  return `<div class="body-error">
    <h1>Error ${code}</h1>
    <p>${message}</p>
  </div>`;
};

function returnToHome() {
  resetPostState();
  display_post(1, "filterPost");
}

window.onload = function() {
  // Reset all state variables on page load
  window.homePage = 1;
  window.state = null;
  window.username = "";
  
  navigate(window.location.pathname);
};

function navigate(path) {
  if (path === "/") {
    // Reset pagination state when navigating
    window.homePage = 1;
    scrollEnd = false;
    Fetching = true;
    if (loadedPostIds) {
      loadedPostIds.clear();
    }

    checkLogedAndaddPopup();
    categories();
    returnToHome();
  } else {
    document.body.innerHTML = errTemplate(404, "page not found");
  }
}

window.addEventListener("popstate", () => {
  navigate(window.location.pathname);
});

async function checkLogedAndaddPopup() {
  try {
    const { state, username } = await window.checkIfLoggedIn() || { state: false, username: "" };
    let pname = document.querySelector('.username');

    pname.textContent = "";
    const centerHome = document.getElementById("centerHome");
    const usersContenar = document.getElementById("users_contenar");
    const topImg = document.getElementById("topImg");
    const createPost = document.getElementById("createPost");
    
    if (centerHome) centerHome.innerHTML = "";
    if (usersContenar) usersContenar.innerHTML = "";
    if (topImg) topImg.classList.add("none");
    if (createPost) createPost.classList.add("none");
    
    if (state) {
      returnToHome();
      if (pname) pname.textContent = username;
      // Initialize WebSocket first to ensure we have connection for user status
      msessagesWS();
      // Only load users once through lastUsersChat
      await lastUsersChat();
      if (topImg) topImg.classList.remove("none");
      if (createPost) createPost.classList.remove("none");
    } else {
      if (typeof closeWS === 'function') {
        closeWS(); 
      }
      toggleMenu('popBackgroundLogin', 'popCreateLogin', 'none');
    }
  } catch (error) {
    console.error("Error in checkLogedAndaddPopup:", error);
    createAlert(alert("alert-danger", "Failed to check login status"));
  }
}

window.state = null;
window.username = "";

window.checkIfLoggedIn = async function () {
    // Also run our login status check that controls post visibility
    await checkLoginStatus();
    
    try {
        let response = await fetch(`/api/is-logged-in`, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
            }
        });

        if (!response.ok) {
            dangerError(response.status)
            return null;
        }

        let user = await response.json();
        if (user !== null) {
            window.state = user.loggedIn;
            window.username = user.username;
        }else{
            window.state = false
        }

        return { state: window.state, username: window.username };
    } catch (error) {
        console.error("Fetch failed:", error);
        createAlert(alert("alert-danger", "Failed to check if the user is logged"))
        return null;
    }
};

// Add event listeners for popup backgrounds and close buttons
document.addEventListener('DOMContentLoaded', () => {
    // Handle popup close button clicks
    document.querySelectorAll('.popTimes span').forEach(button => {
        button.addEventListener('click', (e) => {
            const popup = e.target.closest('.popbody');
            const background = document.querySelector('.popback:not(.none)');
            
            if (popup && background) {
                popup.classList.add('hiding');
                background.classList.add('hiding');
                
                setTimeout(() => {
                    popup.classList.remove('hiding');
                    background.classList.remove('hiding');
                    popup.classList.add('none');
                    background.classList.add('none');
                }, 200);
            }
        });
    });

    // Handle clicking outside popups
    document.querySelectorAll('.popback').forEach(background => {
        background.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                const popup = document.querySelector('.popbody:not(.none)');
                
                if (popup) {
                    popup.classList.add('hiding');
                    background.classList.add('hiding');
                    
                    setTimeout(() => {
                        popup.classList.remove('hiding');
                        background.classList.remove('hiding');
                        popup.classList.add('none');
                        background.classList.add('none');
                    }, 200);
                }
            }
        });
    });

    // Track last focused element before popup
    let lastFocusedElement = null;

    // Handle popup open
    function handlePopupOpen(popup) {
        lastFocusedElement = document.activeElement;
        document.body.classList.add('popup-open');
        
        // Find first focusable element and focus it
        const focusable = popup.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length) {
            focusable[0].focus();
        }

        // Trap focus within popup
        popup.addEventListener('keydown', trapFocus);
    }

    // Handle popup close
    function handlePopupClose() {
        document.body.classList.remove('popup-open');
        if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    }

    // Trap focus within popup
    function trapFocus(e) {
        if (e.key !== 'Tab') return;

        const popup = e.currentTarget;
        const focusable = popup.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus();
                e.preventDefault();
            }
        }
    }

    // Close popup on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const visiblePopup = document.querySelector('.popbody:not(.none)');
            const visibleBackground = document.querySelector('.popback:not(.none)');
            
            if (visiblePopup && visibleBackground) {
                visiblePopup.classList.add('hiding');
                visibleBackground.classList.add('hiding');
                
                setTimeout(() => {
                    visiblePopup.classList.remove('hiding');
                    visibleBackground.classList.remove('hiding');
                    visiblePopup.classList.add('none');
                    visibleBackground.classList.add('none');
                    handlePopupClose();
                }, 200);
            }
        }
    });

    // Update popup show/hide functions
    const showPopup = (popupId, backgroundId) => {
        const popup = document.getElementById(popupId);
        const background = document.getElementById(backgroundId);
        
        if (popup && background) {
            popup.classList.remove('none');
            background.classList.remove('none');
            handlePopupOpen(popup);
        }
    };

    // Update existing popup trigger handlers to use new functions
    document.querySelectorAll('[data-popup]').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const { popup, background } = trigger.dataset;
            showPopup(popup, background);
        });
    });
});
