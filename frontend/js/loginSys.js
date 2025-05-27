document.getElementById("submit-login")?.addEventListener('click', async (event) => {
	event.preventDefault()
	try {
		let email = document.getElementById("emailL").value
		let password = document.getElementById("passwordL").value

		let response = await fetch('/api/log-in', {
			method: 'POST',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ emailname: email, password: password })
		})
		let data = await response.json()
		if (response.ok) {
			createAlert(alert("alert-success", data))
			setTimeout(() => {
				// Update login state
				isUserLoggedIn = true;
				
				// Hide login required overlay
				const loginRequiredOverlay = document.getElementById("login-required-overlay");
				if (loginRequiredOverlay) {
					loginRequiredOverlay.classList.add('none');
				}
				
				// Show navigation elements for logged-in users
				const likedPostButton = document.getElementById("likedpost");
				if (likedPostButton) {
					likedPostButton.classList.remove('none');
				}
				
				// Close the login popup
				toggleMenu('popBackgroundLogin', 'popCreateLogin')
				
				// Reset loaded post IDs to prevent duplicates
				if (typeof loadedPostIds !== 'undefined') {
					loadedPostIds.clear();
				}
				
				// Check login status and update UI - this will also load posts
				checkLogedAndaddPopup()
				
				setTimeout(restoreNotifications, 1000);
			}, 500)
		} else if (response.status === 401) {
			createAlert(alert("alert-caution", data))
		} else {
			dangerError(response.status)
			return
		}
	} catch (error) {
		createAlert(alert("alert-danger", "Failed to login"))
	}
})

function getSelectedGender() {
	const selected = document.querySelector('.mydict input[name="radio"]:checked');
	return selected ? selected.value : null;
}

document.getElementById("submit-register")?.addEventListener('click', async (event) => {
	event.preventDefault()
	try {
		let username = document.getElementById("usernameS").value
		let age = document.getElementById("ageS").value
		let firstname = document.getElementById("firstnameS").value
		let lastname = document.getElementById("lastnameS").value
		let email = document.getElementById("emailS").value
		let password = document.getElementById("paswordS").value
		let gender = getSelectedGender();
		
		let response = await fetch('/api/sign-up', {
			method: 'POST',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				nickname: username,
				age: parseInt(age),
				firstName: firstname,
				lastName: lastname,
				email: email,
				pasword: password,
				gender: gender,
			})
		})

		let data = await response.json()
		
		if (response.ok) {
			createAlert(alert("alert-success", data))
			setTimeout(() => {
				switchtologin()
			}, 500)
		} else {
			if (response.status === 422) {
				createAlert(alert("alert-caution", data))
			} else if (response.status === 409) {
				createAlert(alert("alert-caution", data))
			} else if (response.status === 401) {
				createAlert(alert("alert-caution", data))
			} else {        
				// Update UI after short delay to ensure state is cleared)
				return
			}
		}
	} catch (error) {
		createAlert(alert("alert-danger", "Failed to Signup"))
	}
})

function switchtologin() {
    const registerForms = document.querySelectorAll('.register');
    const loginForms = document.querySelectorAll('.log-in');
    
    registerForms.forEach(form => {
        form.style.display = "none";
        form.classList.remove('w3-animate-zoom');
    });
    
    loginForms.forEach(form => {
        form.style.display = "flex";
        form.classList.add('w3-animate-zoom');
    });
}

function switchtoregister() {
    const registerForms = document.querySelectorAll('.register');
    const loginForms = document.querySelectorAll('.log-in');
    
    loginForms.forEach(form => {
        form.style.display = "none";
        form.classList.remove('w3-animate-zoom');
    });
    
    registerForms.forEach(form => {
        form.style.display = "flex";
        form.classList.add('w3-animate-zoom');
    });
}

// Handle popup animations
document.getElementById('to_register')?.addEventListener('click', switchtoregister);
document.getElementById('to_log_in')?.addEventListener('click', switchtologin);

// Close popup with animation when clicking outside
document.getElementById('popBackgroundLogin')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        const popup = document.getElementById('popCreateLogin');
        const background = document.getElementById('popBackgroundLogin');
        
        popup.classList.add('hiding');
        background.classList.add('hiding');
        
        setTimeout(() => {
            popup.classList.remove('hiding');
            background.classList.remove('hiding');
            popup.classList.add('none');
            background.classList.add('none');
            
            // Reset forms
            document.querySelectorAll('input[type="text"], input[type="password"], input[type="email"]').forEach(input => {
                input.value = '';
            });
        }, 200);
    }
});


