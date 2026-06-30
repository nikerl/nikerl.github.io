(function () {
    function loadContent(url) {
        return fetch(url)
            .then(function (r) { return r.text(); })
            .then(function (html) {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const newWrap = doc.getElementById('content-wrap');
                const curWrap = document.getElementById('content-wrap');
                if (newWrap && curWrap) {
                    curWrap.replaceWith(newWrap);
                }
                document.title = doc.title;
                window.scrollTo(0, 0);
            });
    }

    function navigate(url) {
        loadContent(url).then(function () {
            history.pushState(null, document.title, url);
        });
    }

    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[target="_self"]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        try {
            if (new URL(href, location.origin).origin !== location.origin) return;
        } catch (e) {
            return;
        }
        e.preventDefault();
        navigate(href);
    });

    window.addEventListener('popstate', function () {
        loadContent(location.pathname + location.search);
    });
})();
