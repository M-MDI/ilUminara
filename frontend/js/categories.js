let homePage = 1;

async function categories() {
    try {
        let res = await fetch('/api/categ')
        if (!res.ok) {
            dangerError(res.status)
            return
        }

        const { state } = await window.checkIfLoggedIn()
        let str = await res.json()
        
        let div = ''
        if (state) {
            div = `
                <div class="Fcateg special-category" onclick="handleUserPosts()">
                    <i class="fa-solid fa-user"></i> My Posts
                </div>
                <div class="Fcateg special-category" onclick="handleLikedPosts()">
                    <i class="fa-solid fa-heart"></i> Liked Posts
                </div>
                <div class="category-divider"></div>`
        }


        div += `<div class="Fcateg" onclick="handleCategoryClick('General')">
                    <i class="fa-solid fa-globe"></i> General
                </div>`
            

        const categoryIcons = {
            'Fun': 'fa-gamepad',
            'Technology': 'fa-microchip',
            'Entertainment': 'fa-film',
            'Business': 'fa-briefcase',
            'News': 'fa-newspaper',
            'Zone01': 'fa-code'
        };


        const sortedCategories = str
            .filter(cat => cat.category !== 'General')
            .sort((a, b) => a.category.localeCompare(b.category));

        for (const category of sortedCategories) {
            const icon = categoryIcons[category.category] || 'fa-tag';
            div += `<div class="Fcateg" onclick="handleCategoryClick('${category.category}')">
                <i class="fa-solid ${icon}"></i> ${category.category}
            </div>`;
        }
        
        document.getElementById("filterCategContent").innerHTML = div;
    } catch (err) {
        createAlert(alert("alert-danger", "Failed to fetch categories"))
        console.error(err)
    }
}

function toggleCateg() {
    const content = document.getElementById("filterCategContent")
    const upArrow = document.getElementById("uparrow")
    const downArrow = document.getElementById("downarrow")
    
    if (content.classList.contains("none")) {
        content.classList.remove("none")
        upArrow.classList.remove("none")
        downArrow.classList.add("none")
    } else {
        content.classList.add("none")
        upArrow.classList.add("none")
        downArrow.classList.remove("none")
    }
}

function resetPostState() {
    homePage = 1;
    scrollEnd = false;
    Fetching = true;
    loadedPostIds.clear();
}

function handleCategoryClick(catego) {
    resetPostState();
    document.getElementById('centerHome').innerHTML = "";
    display_post(1, "filterPost", { category: catego });
}

function handleUserPosts() {
    resetPostState();
    document.getElementById('centerHome').innerHTML = "";
    display_post(1, "userPosts");
}

function handleLikedPosts() {
    resetPostState();
    document.getElementById('centerHome').innerHTML = "";
    display_post(1, "likedPost");
}

async function displayCategory() {
    const checkbx = document.getElementById('checkboxes');
    if (!checkbx) return;

    try {
        const response = await fetch('/api/categ');
        if (!response.ok) {
            dangerError(response.status);
            throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        if (!data) {
            createAlert(alert("alert-caution", "No categories found"));
            return;
        }

        const categoryIcons = {
            'General': 'fa-globe',
            'Fun': 'fa-gamepad',
            'Technology': 'fa-microchip',
            'Entertainment': 'fa-film',
            'Business': 'fa-briefcase',
            'News': 'fa-newspaper',
            'Zone01': 'fa-code'
        };

        const sortedData = data.sort((a, b) => a.category.localeCompare(b.category));
        
        let checkboxHTML = '';
        for (const val of sortedData) {
            const icon = categoryIcons[val.category] || 'fa-tag';
            checkboxHTML += `
                <label>
                    <input type="checkbox" name="${val.category}" value="${val.category}">
                    <i class="fa-solid ${icon}"></i>
                    ${val.category}
                </label>`;
        }
        checkbx.innerHTML = checkboxHTML;

        const checkboxes = checkbx.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCategories);
        });

    } catch (err) {
        createAlert(alert("alert-danger", "Failed to display categories"));
        console.error('Error:', err);
    }
}

function showCheckboxes(c) {
    const event = window.event;
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const checkboxes = document.getElementById(c);
    const selectBox = document.querySelector('.selectBox');
    if (!checkboxes) return;

    const isVisible = !checkboxes.classList.contains('none');
    if (!isVisible) {

        checkboxes.classList.remove('none');

        setTimeout(() => {
            function closeCheckboxes(e) {
                if (!checkboxes.contains(e.target) && !selectBox.contains(e.target)) {
                    checkboxes.classList.add('none');
                    document.removeEventListener('click', closeCheckboxes);
                }
            }
            document.addEventListener('click', closeCheckboxes);
        }, 0);
    } else {
        checkboxes.classList.add('none');
    }
}

function updateSelectedCategories() {
    const checkboxes = document.querySelectorAll('#checkboxes input[type="checkbox"]');
    const select = document.querySelector('.selectBox select');
    const selectedCategories = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (selectedCategories.length === 0) {
        select.options[0].text = 'Choose a Categories';
    } else if (selectedCategories.length === 1) {
        select.options[0].text = selectedCategories[0];
    } else {
        select.options[0].text = `${selectedCategories.length} categories selected`;
    }
}
