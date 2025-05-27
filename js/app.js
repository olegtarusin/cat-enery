(() => {
    "use strict";
    function isWebp() {
        function testWebP(callback) {
            let webP = new Image;
            webP.onload = webP.onerror = function () {
                callback(webP.height == 2);
            };
            webP.src = "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
        }
        testWebP((function (support) {
            let className = support === true ? "webp" : "no-webp";
            document.documentElement.classList.add(className);
        }));
    }
    class Preloader {

        constructor({ delay = 50, afterfunc = () => { } } = {}) {
            this.body = BODY
            this.afterfunc = afterfunc;
            this.delay = delay;
            this.currentDelay = 0;
            this.loadCounter = 0;
            this.preloader = document.querySelector("[data-preloader]");
            //получаем список картинок
            this.createImageList();
            //запускаем основную логику
            this.init();

        }
        init() {
            if (this.imageQuantity > 0) {
                this.imageList.forEach(item => {

                    this.currentDelay += this.delay;

                    this.loadImage(item, this.currentDelay)

                })
            }
        }
        loadImage(item, delay) {
            const loadfunc = () => {
                this.loadCounter = ++this.loadCounter;

                this.calcPogress();

            }
            let clone = new Image();
            clone.src = item.src;
            //событие привязываем к клону для безопасности

            clone.onload = () => setTimeout(loadfunc, delay);
            clone.onerror = () => setTimeout(loadfunc, delay);
        }
        calcPogress() {
            if (!this.preloader) return;


            const value = (this.loadCounter / this.imageQuantity) * 100;


            this.preloader.style.setProperty("--page-loader", `${value}%`);

            if (this.loadCounter == this.imageQuantity) {

                //добавляем класс и запускаем действия . когда загрузка окончена
                setTimeout(() => {
                    this.body.classList.add("doc-loaded");
                    this.afterfunc()
                }, this.delay)
            }


        }

        createImageList() {
            this.imageList = [...document.querySelectorAll("img")];
            this.imageQuantity = this.imageList.length;
        }

    }
    class ActionManager {
        constructor() {
            this.actions = [];
            this.action_counter = 0;
        }
        //проверка правильности передачи списка
        checkArray(list) {
            if (!Array.isArray(list)) {
                console.error("Ошибка: переданный параметр 'обьект' не является массивом.");
                return false; // Прерываем выполнение checkArray
            }
            return true; // Если всё нормально
        }


        addAction(func, list = this.actions) {
            if (!this.checkArray(list)) {
                return;
            }
            const iterNumber = ++this.action_counter;
            const id = "action_" + iterNumber;

            const obj = {
                id: id,
                func: func,
                funcClone: func
            };

            list.push(obj);
        }
        //метод ждет id действия например action_2
        //удаление конкретного действия
        removeAction(id_name, list = this.actions) {
            if (!this.checkArray(list)) {
                return;
            }
            const result = list.find(obj => obj.id == id_name);

            if (result) {
                result.func = () => { };
            }

        }
        //возвращение удаленного действия
        backAction(id_name, list = this.actions) {
            if (!this.checkArray(list)) {
                return;
            }
            const result = list.find(obj => obj.id == id_name);
            if (result) {
                result.func = result.funcClone;
            }
        }
        //логируем список действий
        showAction(list = this.actions) {
            if (!this.checkArray(list)) {
                return;
            }
            list.forEach(obj => {

                console.log("id: " + obj.id);
                console.log("active-func", obj.func);
                console.log("clone", obj.funcClone);


            });
        }
    }


    class Listener extends ActionManager {
        constructor(event_name, target = document) {
            super()
            this.event_name = event_name;
            this.target_elem = target;

            this.notDebunceAction = [];
            this.debunceTimeout = null;
            this.debunceDelay = 100;
            this.debunceEvents = ["resize", "scroll", "mousemove", "touchmove"];
            //задаем список событий с дебаусингом
            this.#addListener();//вешаем обработчик
        }
        //адаптируем функционал менеджера для мгновенных событий
        addNotDebunceAction(func) {
            this.addAction(func, this.notDebunceAction);
        }
        removeNotDebunceAction(id) {
            this.removeAction(id, this.notDebunceAction);
        }
        backNotDebunceAction(id) {
            this.backAction(id, this.notDebunceAction);
        }
        showNotDebunceAction() {
            this.showAction(this.notDebunceAction);
        }
        #handleDebunce(e) {
            if (this.notDebunceAction.length > 0) {
                this.notDebunceAction.forEach(obj => obj.func(e));// Выполнить функцию без задержки
            }
            clearTimeout(this.debunceTimeout); // Очистить предыдущий таймер, если был
            this.debunceTimeout = setTimeout(() => {
                this.actions.forEach(obj => obj.func(e));// Выполнить функцию после задержки
            }, this.debunceDelay);
        }
        #addListener() {


            this.target_elem.addEventListener(this.event_name, (e) => {
                //Дебаунсинг для события resize,scroll и остальных из списка
                if (this.debunceEvents.includes(this.event_name)) {
                    this.#handleDebunce(e);
                } else {
                    this.actions.forEach(obj => obj.func(e));// Выполнить функцию после задержки
                }
                // Вызов всех дополнительных функций, добавленных в clickActions

            });
        }
    }

    //обязательно ставим data-swipe на область где нужен свайп и data-event-block на дочерний елемент для правельной работы
    class Swipe {
        constructor() {

            this.events = ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"];
            this.moveDelay = 0;

            this.swipe_zone_selector = '[data-swipe]';//селектор где свайп возможен
            this.event_block_selector = '[data-event-block]'//селектор где умышлено будут отключатся события
            //нужно для гибкости 
            this.active_swipe_zone = null;
            this.blocked_zone = null;
            //запускаем методы
            //создаем обработчики
            this.listeners = this.#addListeners(this.events);
            //обнуляем координаты x y xDef yDef
            this.#setNullcord();
            //описываем колбеки событий
            this.#addActionToEvents();
            //создаем пустые списки действий при событие
            this.#createActionLists();

        }
        #setNullcord() {
            this.x = null;
            this.y = null;
            this.xDef = 0;
            this.yDef = 0;
        }
        #createActionLists() {
            this.startActionList = [];
            this.moveActionList = [];
            this.endActionList = [];
        }

        // Создаем Listener для каждого события
        #addListeners(evList) {
            return evList.map(evName => new Listener(evName));
        }

        //функции возврата\удаления всех событий с зоны блокировки чтоб не нарушить поведение свайпа
        #backEvents(e) {
            if (this.blocked_zone && this.blocked_zone.classList.contains("events-removed")) {
                this.blocked_zone.classList.remove("events-removed");
                this.blocked_zone.style.pointerEvents = "";
                this.blocked_zone.style.userSelect = "";
                this.blocked_zone = null;
                //удаляем спец-класс и стили
            }
        }
        #removeEvents(e) {

            if (this.x !== null && this.y !== null && !this.blocked_zone && e.target.closest(this.event_block_selector)) {
                this.blocked_zone = e.target.closest(this.event_block_selector);
                if (!this.blocked_zone.classList.contains("events-removed")) {
                    this.blocked_zone.classList.add("events-removed");
                    this.blocked_zone.style.pointerEvents = "none";
                    this.blocked_zone.style.userSelect = "none";
                    //добавляем спец-класс и убераем обработку событий
                }


            }
        }

        //описываем основные действия
        startSwipe(e) {

            if (this.x === null && this.y === null && e.target.closest(this.swipe_zone_selector)) {
                this.active_swipe_zone = e.target.closest(this.swipe_zone_selector);
                const { x, y } = this.#getXandY(e);

                this.x = x;
                this.y = y;

                if (this.startActionList.length > 0) {
                    const args = this.active_swipe_zone;
                    this.startActionList.forEach(action => action(args));
                }
            }
        };

        moveSwipe(e) {

            if (this.x !== null && this.y !== null) {
                const { x, y } = this.#getXandY(e);

                this.xDef = x - this.x;
                this.yDef = y - this.y;

                const cords = {
                    x: this.x,
                    y: this.y,
                    xDef: this.xDef,
                    yDef: this.yDef,
                }

                if (this.moveActionList.length > 0) {
                    const args = [cords, e];
                    this.moveActionList.forEach(action => action(...args));
                }

            }
        };

        endSwipe(e) {

            if (this.x !== null && this.y !== null) {
                this.#backEvents(e);//возвращаем обработку событий для елемента data-swipe

                if (this.endActionList.length > 0) {
                    const args = e;
                    this.endActionList.forEach(action => action(args));
                }
                this.active_swipe_zone = null;
                // Обнуление координат после окончания свайпа
                this.#setNullcord();
            }
        };
        // Добавляем действия на события
        #addActionToEvents() {
            // Добавляем обработчики действий для каждого события
            this.listeners.forEach(listener => {
                switch (listener.event_name) {
                    case "mousedown":
                    case "touchstart":
                        listener.addAction((e) => this.startSwipe(e));
                        break;
                    case "mousemove":
                    case "touchmove":
                        //устанавливаем замедление события move
                        listener.debunceDelay = this.moveDelay;
                        //добавляем моментальное действие
                        listener.addNotDebunceAction((e) => this.#removeEvents(e));
                        //убираем обработку событий не елементе data-swipe для четкости работы свайпа сработает только при первом движении после нажатия
                        listener.addAction((e) => this.moveSwipe(e));
                        break;
                    case "mouseup":
                    case "touchend":
                        listener.addAction((e) => this.endSwipe(e));
                        break;
                    default:
                        console.log("Ошибка: Неизвестное событие");
                        break;
                }
            });
        }

        // Получение координат из события
        #getXandY(e) {
            let x = null, y = null;
            if (e.type === "mousedown" || e.type === "mousemove" || e.type === "mouseup") {
                x = e.clientX;
                y = e.clientY;

            } else if (e.type === "touchstart" || e.type === "touchmove" || e.type === "touchend") {
                if (e.touches && e.touches[0]) {
                    x = e.touches[0].clientX;
                    y = e.touches[0].clientY;
                }
            }
            return { x, y };
        }
        //экспортные методы . обращаеися именно к ним в других классах
        setOnSwipeStart(callback) {

            this.startActionList.push(callback);
        }
        setOnSwipeMove(callback) {
            this.moveActionList.push(callback);
        }
        setOnSwipeEnd(callback) {
            this.endActionList.push(callback);
        }

    }
    //data-hold-on-lost-scroll='padding' ставим на те элементы что удерживаем падингом
    //data-hold-on-lost-scroll='left' ставим на те элементы где нужно менять соотвецтвующую позицию
    //data-hold-on-lost-scroll='right' ставим на те элементы где нужно менять соотвецтвующую позицию
    //выравнивание елементов  отcтупами left\right НЕ РАБОТАЕТ С ПРОЦЕНТАМИ

    class BodyLock {
        constructor() {
            this.bodyClasses = BODY.classList;
            this.lockSpace = window.innerWidth - BODY.offsetWidth;
            this.delay = 0;
            this.holdElems = [...document.querySelectorAll("[data-hold-on-lost-scroll]")];
            this.holdElemsPadding = this.#filterElems("padding");
            this.holdElemsLeft = this.#filterElems("left");
            this.holdElemsRight = this.#filterElems("right");
            //добавляем обработку изменения ширины скролбара и размера окна
            this.lastLockSpace = this.lockSpace;
            this.holdPositionOnResize();

        }
        #testLockSpaceOnChange() {
            // Вычисляем новую ширину
            if (window.innerWidth - BODY.offsetWidth !== this.lastLockSpace) {
                // Обновляем lockSpace и lastLockSpace, если ширина изменилась
                this.lastLockSpace = window.innerWidth - BODY.offsetWidth;
                this.lockSpace = this.lastLockSpace; // Присваиваем новое значение
                return true; // Ширина изменилась
            }
            return false; // Ширина не изменилась
        }

        getDataList(elem) {
            return elem.dataset.holdOnLostScroll.split(",");
        }
        #filterElems(value) {
            return this.holdElems.filter(elem => {
                const elem_dataset_list = this.getDataList(elem);
                return elem_dataset_list[0] === value;


            })
        }
        #shouldSetStyle(holdElem, value) {
            const holdElem_data_list = this.getDataList(holdElem);
            let allowed_width;

            // Если есть хотя бы 2 элемента в списке данных
            if (holdElem_data_list.length >= 2) {
                allowed_width = +holdElem_data_list[1];
                if (!isNaN(allowed_width) && (window.innerWidth < allowed_width || value == '')) {
                    return true;

                } else {
                    return false;
                }
            } else {
                return true;
            }
        }

        holdPositionOnResize() {
            resizeListener.addAction(() => {
                if (this.bodyClasses.contains("lock")) {
                    this.#changePositionFixedElemsTo(this.lockSpace);
                    if (this.#testLockSpaceOnChange()) {
                        this.addBlock();
                    }
                }
            })
        }

        #changePositionFixedElemsTo(scroll_space) {

            const changeStyle = (list, direction) => {
                if (list.length > 0 && (direction === "left" || direction === "right")) {
                    list.forEach(elem => {
                        //проверяем соблюдается ли условие
                        if (this.#shouldSetStyle(elem, scroll_space)) {
                            let style_value_new;
                            //определяем высчитано ли расстояния
                            if (typeof (scroll_space) === "number") {
                                elem.style[direction] = '';
                                //обнуляем значение стиля для универсальности кода
                                let style_value_before = window.getComputedStyle(elem)[direction];
                                style_value_before = parseFloat(style_value_before);
                                //получаем ТОЧНОЕ значение отступа

                                style_value_new = (direction === "left") ? style_value_before : style_value_before + scroll_space;
                                style_value_new += 'px';
                                //корректируем значение с учетом исщезновения полосы прокрутки
                            } else {
                                style_value_new = '';
                            }
                            elem.style[direction] = style_value_new;
                            //переназначаем стиль
                        }

                    })
                }
            }
            //применяем метод к елементам с правым и левым отступом
            changeStyle(this.holdElemsLeft, "left");
            changeStyle(this.holdElemsRight, "right");

        }

        #changeElemsPaddingTo(value) {
            //добавляем паддинг елементам без отcтупа
            if (this.holdElemsPadding.length > 0) {
                this.holdElemsPadding.forEach(holdElem => {

                    if (this.#shouldSetStyle(holdElem, value)) {

                        holdElem.style.paddingRight = `${value}`;
                    }


                })
            }

            BODY.style.paddingRight = `${value}`
        }

        getBodyStatus() {
            return this.bodyClasses.contains('lock') ? "lock" : "unlock";
        }
        toggleBlock() {
            this.bodyClasses.toggle("lock");
            const status = this.getBodyStatus();
            setTimeout(() => {
                if (status === "lock") {
                    this.addBlock();

                } else {
                    this.removeBlock();

                }
            }, this.delay)

        }
        addBlock() {
            if (BODY.style.overflow != "hidden") BODY.style.overflow = "hidden";
            this.#changePositionFixedElemsTo(this.lockSpace);
            this.#changeElemsPaddingTo(`${this.lockSpace}px`);
        }
        removeBlock() {
            BODY.style.overflow = "";
            this.#changeElemsPaddingTo('');
            this.#changePositionFixedElemsTo('');
        }


    }
    class ScrollDirection {
        constructor() {
            this.lastScroll = window.scrollY;
        }

        // Метод для определения направления прокрутки
        getScrollDirection() {

            const scrollDest = window.scrollY - this.lastScroll;
            this.lastScroll = window.scrollY;

            if (scrollDest > 0) {
                return "down";  // Прокрутка вниз
            }
            if (scrollDest < 0) {
                return "up";    // Прокрутка вверх
            }
            return "none"; // Отсутствие прокрутки
        }
    }
    class ActivePageNavMarker {

        constructor(nav_selector) {
            this.navbox_selector = nav_selector;
            this.path = document.location.pathname;
            this.linkList = this.getLinkList(this.navbox_selector);// Массив из ссылок в навигации
            this.highlightActiveLink();//маркировка ссылок
        }
        highlightActiveLink() {
            if (this.linkList.length > 0) {
                this.linkList.forEach(link => {
                    this.#addActiveClassToLink(link);
                })
            }

        }

        getLinkList(nav_selector) {
            const navbox = document.querySelector(nav_selector);
            let allLinks = []//создаем массив для предотвращения ошибок
            if (navbox) {
                const links = navbox.querySelectorAll("a");
                if (links.length > 0) {
                    allLinks = Array.from(links);  // Преобразуем NodeList в массив и добавляем
                }
            }

            return allLinks;  // Возвращаем массив всех ссылок
        }

        #addActiveClassToLink(link) {
            const href_value = link.getAttribute("href");
            // Используем this.path для корректной работы
            if (this.path.endsWith(href_value) || (this.path === "/" && href_value === "index.html")) {
                setTimeout(() => {
                    link.classList.add("active-link");
                }, 100);
            }
        }
    }

    class Burger {
        constructor(burger_btn = ".icon-menu", mobile_width = 768.5) {
            this.burger_btn = burger_btn;//минимальная ширина для выключения
            this.mobile_width = mobile_width;
            this.animation_time = 1000;//задержка для правельного закрытия меню при скролле
            this.bodyClasses = BODY.classList;
            this.bodyLock = lockBody;
            //получаем ссылку на экземпляр блокиратора
            clickListener.addAction((e) => {
                this.#toggleMenuOpen(e);
            })
            resizeListener.addAction(() => {
                //закрывание бургера при изменении размера выше указаного
                this.#closeOnResize();
                //добавление\удаление блока при слиянии экранов
                this.#toggleLockOnScreenSizeChange();

            })
            scrollListener.addAction(this.closeOnScroll.bind(this))
        }
        closeOnScroll() {
            //закрывание меню при скроле вниз на планшетах
            if (this.bodyClasses.contains("menu-open") && !this.bodyClasses.contains("lock")) {
                this.bodyClasses.remove("menu-open");
                //нужно чтоб анимация закрывания правельно работала
                this.bodyClasses.add("non-hide");
                setTimeout(() => {
                    this.bodyClasses.remove("non-hide")
                }, this.animation_time)

            }
        }
        #closeOnResize() {
            if (window.innerWidth >= this.mobile_width) {
                if (this.bodyClasses.contains("menu-open")) {
                    this.bodyClasses.remove("menu-open");
                    if (this.bodyClasses.contains("lock")) {
                        this.bodyClasses.remove("lock");
                        this.bodyLock.removeBlock();

                    }
                }

            }
        }
        #toggleLockOnScreenSizeChange() {
            if (window.innerWidth < this.mobile_width && this.bodyClasses.contains("menu-open")) {
                if (window.innerHeight < this.mobile_width && !this.bodyClasses.contains("lock")) {
                    this.bodyClasses.add("lock");
                    this.bodyLock.addBlock();
                } else if (window.innerHeight >= this.mobile_width) {
                    this.bodyClasses.remove("lock");
                    this.bodyLock.removeBlock();
                }
            }
        }
        #toggleMenuOpen(e) {
            if (e.target.closest(this.burger_btn)) {
                this.bodyClasses.toggle("menu-open");

                if (window.innerHeight < this.mobile_width) {
                    this.bodyLock.toggleBlock();
                }
            }
        }

    }

    //класс для замена времени анимации. в зависимости от прогресса прогрессбара
    class ProgressSmoothClick {
        constructor(style_var = '--progress-click-time', sub_class = 'progress-click') {
            this.sub_class = sub_class;
            this.style_var = style_var;
            //временые переменные обновляющиеся каждый раз
            this.current_style = null;
            this.animation_run = null;
        }

        calcNewTime(time, old_value, new_value) {
            //расщитываем новое время анимации. основываясь на текущей позиции
            let new_time = Math.abs(new_value - old_value);
            new_time = new_time * time / 100;
            return new_time;

        }
        //меняем свойства переменной и добавляем спец-класс елементу с переменной
        changeStyleVar(elem, time) {
            const new_value = `${time}s`;
            elem.classList.add(this.sub_class);
            elem.style.setProperty(this.style_var, new_value);
        }
        //возвращаем переменную обратно
        backStyleVar(elem, old_value) {

            elem.style.setProperty(this.style_var, old_value);
            elem.classList.remove(this.sub_class);


        }
        //елемент который передаем . должен содержать переменную
        init(old_input, new_input, styled_elem) {

            const style_value = styled_elem.style.getPropertyValue(this.style_var);

            if (style_value) {
                //определяем работает ли анимация
                if (!styled_elem.classList.contains(this.sub_class)) {
                    //запоминаем значение стилевой переменной
                    this.current_style = style_value;

                } else {
                    //возвращаем реальное время анимации
                    clearTimeout(this.animation_run);
                    this.backStyleVar(styled_elem, this.current_style);

                }
                //получаем текущее время анимации
                const time = parseFloat(this.current_style);

                if (Number.isNaN(time)) return;
                //расщитываем новое время анимации. основываясь на текущей позиции
                const new_time = this.calcNewTime(time, old_input, new_input);

                //меняем стилевую переменную
                this.changeStyleVar(styled_elem, new_time);

                this.animation_run = setTimeout(() => {
                    //возвращаем значение переменной обратно
                    this.backStyleVar(styled_elem, this.current_style);
                    //обнуляем значение стилевой переменной и таймера
                    this.current_style = null;
                    this.animation_run = null;
                }, new_time * 1000);


            }


        }
        //лечим анимацию инпута
        handleInput(styled_elem, input) {
            let input_old_value = null;
            overListener.addAction((e) => {
                if (e.target == input) {
                    input_old_value = input.value;

                }
            })
            outListener.addAction((e) => {
                if (e.target == input) {
                    input_old_value = null;

                }
            })
            inputListener.addAction((e) => {
                if (e.target == input && input_old_value != null) {

                    const input_new_value = input.value;

                    if (input_new_value != input_old_value) {

                        if (Math.abs(input_new_value - input_old_value) > 1) {
                            //выравниваем анимацию при клике
                            this.init(input_old_value, input_new_value, styled_elem);
                        }


                        input_old_value = input_new_value;


                    }


                }
            })

        }
    }

    //выставляем свайп зону , при помощи data-swipe и блокируем случайные события внутри нее data-event-block
    //ВАЖНО ставить data-swipe на ребенке галереи, а не на самой галереи. так как распространение свайпа на инпут перекроит логику инпута
    class BeforeAfterGallery {
        selectors = {
            wrapper: ".progress-gallery",
            slide_body: ".progress-gallery__body",
            slide_before: ".progress-gallery__image-before",
            slide_after: ".progress-gallery__image-after",
            btn_before: ".btn-before",
            btn_after: ".btn-after",
            progress_input: ".progress__input"
        }
        constructor() {
            this.gallery_list = document.querySelectorAll(this.selectors.wrapper);
            this.smoothClick = new ProgressSmoothClick();
            if (this.gallery_list.length > 0) {
                this.gallery_list.forEach(gallery => {
                    this.handleGallery(gallery);


                })
            }

        }
        handleGallery(gallery) {
            const gallery_body = gallery.querySelector(this.selectors.slide_body);
            if (gallery_body) {
                //определяем елементы
                const gallery_input = gallery.querySelector(this.selectors.progress_input);
                const gallery_btns = {
                    btn_before: gallery.querySelector(this.selectors.btn_before),
                    btn_after: gallery.querySelector(this.selectors.btn_after)
                }
                //задаем размер картинок по ширене тела галлереи
                this.setImagesWidth(gallery_body)

                if (gallery_input) {
                    //работа инпута
                    this.onInput(gallery, gallery_input);


                    //клик на кнопки
                    if (gallery_btns.btn_after && gallery_btns.btn_before) {
                        this.onBtnClick(gallery, gallery_input);
                    }
                    //обработка свайпов
                    this.addSwipe(gallery, gallery_body, gallery_input);

                }

            }



        }

        #getPercentFromWidth(block_width, width) {
            let new_percent = (width / block_width) * 100;
            return Math.round(new_percent)
        }

        #roundUpResult(prev_percent, end_percent) {
            if (typeof prev_percent === "number" && typeof end_percent === "number" && prev_percent !== end_percent) {
                let result = null;
                const def_percent = Math.abs(prev_percent - end_percent);

                if (def_percent > 40) {
                    result = prev_percent > end_percent ? 0 : 100;
                } else if (def_percent < 5) {
                    //запускаем эластичность когда это нужно
                    if (end_percent > 5 && end_percent < 95) {
                        result = prev_percent;
                    }
                } else {
                    result = end_percent;
                }

                return result;
            } else {
                return undefined;  // Явно возвращаем undefined в случае не выполнения условий
            }
        }
        setImagesWidth(body) {
            this.#changeImagesWidth(body);
            resizeListener.addAction(this.#changeImagesWidth.bind(this, body));
        }

        onInput(gal, gal_input) {
            this.#showSlideBalance(gal, gal_input, gal_input.value);

            //ровняем анимацию
            this.smoothClick.handleInput(gal, gal_input);
            //обновляем значение --slide-balance и value у инпута
            inputListener.addAction(() => {
                this.#showSlideBalance(gal, gal_input, gal_input.value);
            });

        }

        addSwipe(gal, gal_body, gal_input) {
            //добавляем переменную статуса для того чтоб правельно выщитать изменения
            let input_prev_value;
            let new_percent;
            //добавляем спец переменные
            let swipeEnd = true;
            let active_gal = null;
            swipeListener.setOnSwipeStart((elem) => {

                active_gal = this.#checkActiveGallery(gal, elem, swipeListener.swipe_zone_selector);
                //определяем активна ли галерея


            })
            swipeListener.setOnSwipeMove((cords, e) => {

                //проверяем активную галерею для правельной работы нескольких галерей
                if (active_gal) {
                    //в начале свайпа получаем значение инпута
                    if (swipeEnd === true) {
                        input_prev_value = Number(gal_input.value);
                        swipeEnd = false;
                    }
                    const x = cords.xDef;

                    const gal_body_width = gal_body.offsetWidth;

                    //получаем значение процентов для движения
                    const x_percent = this.#getPercentFromWidth(gal_body_width, x);
                    new_percent = input_prev_value + x_percent;
                    //корректируем значение процентов
                    new_percent = (new_percent >= 0 && new_percent <= 100) ? new_percent : (new_percent < 0) ? 0 : 100;
                    gal_input.value = new_percent;
                    //обновляем атребут --slide-balance и атребут value для инпута
                    this.#showSlideBalance(gal, gal_input, new_percent);
                }


            })

            swipeListener.setOnSwipeEnd((e) => {
                if (active_gal) {
                    const result = this.#roundUpResult(input_prev_value, new_percent);

                    if (result !== undefined) {  // Проверяем, что result определен
                        gal_input.value = result;
                        this.#showSlideBalance(gal, gal_input, result);
                    }
                    //обнуляем спец переменные
                    swipeEnd = true;
                }
                active_gal = null;
            });


        }
        //проверяем относится ли e.target к галерее
        #checkActiveGallery(gallery, target, target_selector) {
            const gallery_child = gallery.querySelector(target_selector);
            // Проверка на активную галерею:
            // Позволяет определить активную галерею как по вложенному элементу с data-swipe,
            // так и по самой галерее, если data-swipe стоит на ней. Это повышает гибкость разметки
            // и предотвращает баги при вложенных галереях или альтернативных структурах.


            if ((gallery_child && gallery_child == target) || gallery == target) {
                return true
            } else {
                return false
            }

        }
        onBtnClick(gallery, input) {

            clickListener.addAction((e) => {
                if (e.target.closest(this.selectors.btn_before) || e.target.closest(this.selectors.btn_after)) {
                    const input_prev_value = input.value;
                    const isBtnBefore = e.target.closest(this.selectors.btn_before);
                    const isBtnAfter = e.target.closest(this.selectors.btn_after);

                    let galery_active = null;
                    //специальная переменная чтоб действия касались конкретной галереи
                    if (isBtnBefore) {
                        galery_active = this.#checkActiveGallery(gallery, isBtnBefore, this.selectors.btn_before);
                    } else {
                        galery_active = this.#checkActiveGallery(gallery, isBtnAfter, this.selectors.btn_after);
                    }
                    //выбираем активную галерею
                    if (galery_active) {
                        if (isBtnBefore) {
                            input.value = 0;
                        }
                        if (isBtnAfter) {
                            input.value = 100;
                        }
                        const new_input_value = input.value;
                        if (input_prev_value !== new_input_value) {
                            //меняем время анимаци и добавляем на время класс нашей галерее
                            this.smoothClick.init(input_prev_value, new_input_value, gallery)
                            this.#showSlideBalance(gallery, input, new_input_value);
                            //обновляем значение --slide-balance и value у инпута
                        }
                    }
                }

            })
        }
        //задавание размера картинкам
        #changeImagesWidth(gal_body) {
            const images = gal_body.querySelectorAll("img");
            const gal_body_width = gal_body.offsetWidth;

            if (images.length > 0) {
                images.forEach(image => {
                    image.style.width = `${gal_body_width}px`;
                })
            }
        }
        //обновляем значение --slide-balance и value у инпута
        #showSlideBalance(gal, input, inputValue) {

            window.requestAnimationFrame(() => {
                gal.style.setProperty("--slide-balance", `${inputValue}%`);
                input.setAttribute("value", inputValue);
            })


        }

    }

    //елементы не должны быть вложеными друг в друга иначе будут нежелательные итерации
    class ElemHeight {
        constructor(elem, styleVar) {
            this.elem = elem;
            this.styleVar = styleVar;
        }

        init() {
            this.getHeigth();
            if (!this.value) return;
            if (this.value !== this.oldValue) {
                this.oldValue = this.value;
                this.setHeight();
            }
        }

        getHeigth() {
            if (!this.elem) return;
            this.value = this.elem.offsetHeight;
        }

        setHeight() {
            if (!this.styleVar || !this.value) return;
            BODY.style.setProperty(`${this.styleVar}`, `${this.value}px`)
        }

        initOnTransition() {
            const transElem = this.elem.querySelector("[data-transition-event]");

            if (transElem) {
                const transValue = transElem.dataset.transitionEvent;
                if (!transValue) return;
                this.elem.addEventListener("transitionend", (e) => {
                    if (e.propertyName == 'padding-top') {
                        headerHeight.init();
                    }


                })

            }
        }
    }

    class HeaderBehavior {
        constructor(first_section_selector, top_save_height = 32) {
            this.header = HEADER
            this.firstElem = document.querySelector(first_section_selector);

            this.saveHeight = top_save_height;
            if (this.header) {

                this.headerClasses = this.header.classList;
                this.dirScroll = scrollDir.getScrollDirection.bind(scrollDir);
                this.iteration(); //запуск методов
            }

        }

        iteration() {
            headerHeight.init();
            //присваеваем хедеру класс в зависимости от положения скролла
            this.addHeaderClasses();
            //вызываем другие классы
            scrollListener.addNotDebunceAction((e) => {
                window.requestAnimationFrame(() => {
                    this.checkScroll(e); // Передаем тело события e

                });
            });
            //пересчитываем размер хедера если что-то поменялось
            //после завершения перехода
            headerHeight.initOnTransition();
            //при ресайзе
            resizeListener.addAction(() => {
                headerHeight.init()
            })

        }
        checkScroll = (event) => {

            //определение направления скролла
            const scrollDest = this.dirScroll();

            //вызов добавления классов
            this.addHeaderClasses(scrollDest, event);

        }
        #addClassOnFirstSection(scroll) {
            if (this.firstElem) {
                this.firstElemHeight = this.firstElem.offsetHeight;

                if (scroll <= (this.firstElemHeight - headerHeight.value)) {
                    this.headerClasses.add("header-first-page-view");
                } else if (scroll > (this.firstElemHeight - headerHeight.value)) {
                    this.headerClasses.remove("header-first-page-view");
                }
            }
        }
        #addHideClassOnScrollDown(scroll, dest) {
            // Скролл вниз - скрываем хедер, скролл вверх - показываем
            //если не видно первого блока
            if (dest === "down") {
                if ((this.firstElem && scroll >= (this.firstElemHeight + this.saveHeight)) || (!this.firstElem && scroll > this.saveHeight)) {
                    if (!this.header.closest(".menu-open") || !this.header.closest(".lock")) {
                        //проверка на non-hide нужна для закрытия бургера при скролле
                        if (!this.header.closest(".non-hide")) {
                            this.headerClasses.add("header-hide");
                        }

                    }
                }
            } else if (dest === "up") {
                this.headerClasses.remove("header-hide");
            }
        }

        #changeHeaderOnPageStart(scroll) {
            //добавляем спец класс когда мы в начале страницы
            if (scroll <= (this.saveHeight + headerHeight.value)) {

                this.headerClasses.add("header-top");

            } else {
                this.headerClasses.remove("header-top");

            }

        }

        // Добавляем или удаляем классы для хедера в зависимости от прокрутки
        addHeaderClasses(dest, ev) {
            this.scrollY = window.scrollY;
            //добавление спец класса когда видна титульная страница
            this.#addClassOnFirstSection(this.scrollY);
            //в начале страницы добавляем спец-класс header-top
            this.#changeHeaderOnPageStart(this.scrollY);
            //если не видно первого блока
            this.#addHideClassOnScrollDown(this.scrollY, dest);
            // Скролл вниз - скрываем хедер, скролл вверх - показываем

        }

    }

    //скрипт который грузит картинки тогда,когда окно входит в брейкпоинт
    //из атрибута data-src 
    //resize-load вешаем на сами картинки - это важно для скрипта
    //data-resize-load="0,768" - пример заполнения атрибута
    class ResizeLoad {
        constructor() {
            this.elem__list = [...document.querySelectorAll('[data-resize-load]')];
            //превращаем список елементов в список обьектов
            this.createObjList();
            //запускаем обработку картинок
            this.init();
            resizeListener.addAction(this.init.bind(this));
        }
        init() {

            const window_width = window.innerWidth;
            if (this.elem__list.length > 0) {
                this.elem__list.forEach(obj => {
                    //спец переменная для работы с брейкпоинтами
                    let shouldInit = false;
                    //задаем брейкпоинты
                    if (!obj.maxWidth && window_width >= obj.minWidth) shouldInit = true;

                    if (obj.maxWidth) {

                        if (obj.minWidth > obj.maxWidth) {

                            if (window_width >= obj.minWidth || window_width <= obj.maxWidth) shouldInit = true;
                        } else {
                            if (window_width >= obj.minWidth && window_width <= obj.maxWidth) shouldInit = true;
                        }

                    }

                    if (shouldInit) {
                        //запускаем обработку. когда попадаем в брекпоинты
                        this.replaceAddress(obj);
                    }

                })
            }
            //убираем из списка обработаный элемент
            this.elem__list = this.elem__list.filter(obj => obj.path !== 'loaded');

        }

        replaceAddress(obj) {
            if (obj.path === 'loaded') return;
            //задаем адрес для не загруженых картинок
            obj.elem.setAttribute('src', obj.path);
            //добавляем спец-класс и обновляем статус
            obj.elem.classList.add("picture-loaded")
            obj.path = 'loaded';
        }

        createObjList() {
            if (this.elem__list.length > 0) {
                this.elem__list = this.elem__list.map(elem => {
                    let obj = null;
                    //спец значение для валидации обьекта
                    let valid = true;
                    const dataValue = elem.dataset.resizeLoad;
                    const path = elem.dataset.src;
                    if (dataValue && path) {
                        let [minWidth, maxWidth] = dataValue.split(',');
                        //валидация значение атрибута
                        if (isNaN(minWidth) || (maxWidth && isNaN(maxWidth))) {
                            console.warn(elem, "неверное значение у атрибута data-resize-load , он принимает только числовые значения");
                            valid = false;
                        }
                        if (valid) {

                            //создаем обьект
                            obj = {
                                elem: elem,
                                path: path,
                                minWidth: minWidth,
                                maxWidth: maxWidth
                            }
                        }
                        return obj;

                    } else {
                        console.warn(elem, 'не заполнен атрибут resize-load или data-src');
                        return null
                    }

                }).filter(Boolean);
            }
        }

    }

    class HoverEffect {
        constructor() {
            this.ev_list = ['mousedown', 'mouseup', 'touchstart', 'touchend', 'pointerout'];
            //превращаем ev_list в список обработчиков событий
            this.createEventObservers();
            this.init();

        }
        createEventObservers() {
            this.ev_list = this.ev_list.map(ev => {
                return new Listener(ev);
            })
        }
        init() {
            //добавляем действия каждому из обработчиков
            this.ev_list.forEach(listener => {
                switch (listener.event_name) {
                    case "mousedown":
                    case "touchstart":
                        listener.addAction((e) => this.addHover(e));
                        break;
                    case "mouseup":
                    case "touchend":
                    case "pointerout":
                        listener.addAction((e) => this.removeHover(e));
                        break;
                    default:
                        console.log("Ошибка: Неизвестное событие");
                        break;

                }
            })


        }
        addHover(e) {
            if (e.target.closest('button') || e.target.closest('a')) {
                //присваеваем target значение кнопки или ссылки на которой находимся
                this.target = e.target.closest('button') ? e.target.closest('button') : e.target.closest('a');
                //добавляем класс при нажатии
                this.target.classList.add("hover");
            }

        }
        removeHover() {
            if (this.target) {
                //удаляем класс , когда клик закончился
                this.target.classList.remove("hover");
                //обнуляем таргет
                this.target = false;
            }

        }

    }

    // Класс-обёртка над IntersectionObserver — для наблюдения за входом/выходом элементов из области видимости
    class IntObserver {
        constructor(thresholdValue, call) {
            this.action = call; // Функция, которую вызываем при пересечении
            this.options = {
                root: null, // Область наблюдения — viewport
                threshold: thresholdValue // Порог видимости (например, 0.1 = 10% видимости)
            }

            this.callback = this.callback.bind(this);
            this.observer = new IntersectionObserver(this.callback, this.options);
        }

        // Callback вызывается при изменении пересечения наблюдаемых элементов
        callback(entries) {
            if (entries.length > 0) {
                entries.forEach(entry => {
                    this.action(entry); // Вызываем переданную извне функцию
                });
            }
        }

        observe(target) {
            if (target) {
                this.observer.observe(target); // Начать наблюдение за элементом
            }
        }

        unobserve(target) {
            if (target) {
                this.observer.unobserve(target); // Прекратить наблюдение
            }
        }

        disconnect() {
            this.observer.disconnect(); // Полностью отключить наблюдатель
        }
    }
    class StepIntersect {
        constructor({
            boardSelector,
            delayAttrSelector = "[data-delay]",
            delayDataName = "delay",
            threshold = 0.1
        }) {
            this.boardAtr = boardSelector;//дата атребут контейнера
            this.delayAtr = delayAttrSelector;//дата атребут для задержки
            this.delayDataName = delayDataName;//название атребута задержки в dataset
            //переменная для хранения количества одновременных пересечений
            this._entryCounter = 0;

            this.boardList = document.querySelectorAll(this.boardAtr); // Все доски на странице
            this._intFunc = this._intFunc.bind(this);


            // Создаём наблюдатель с порогом 10%
            this._observer = new IntObserver(threshold, this._intFunc);

            // Запускаем наблюдение за всеми карточками на странице
            if (this.boardList.length > 0) {
                this.boardList.forEach(board => {
                    this.observeCards(board);
                });
            }

        }
        // Получаем задержку загрузки с data-load-delay (в секундах, умножаем на 1000)
        _getDelay(target) {
            if (target.closest(this.delayAtr)) {
                const delayValue = target.closest(this.delayAtr).dataset[this.delayDataName];

                if (delayValue && !isNaN(delayValue)) {
                    return delayValue * 1000;
                } else {
                    return 0;
                }
            } else {
                return 0;
            }
        }
        // Начать наблюдение за всеми карточками внутри одной доски
        observeCards(board) {
            const cards = [...board.children];
            if (cards.length > 0) {
                cards.forEach(card => {
                    this._observer.observe(card);
                });
            }
        }
        //добавление карты в существующий обработчик
        addCard(card) {
            this._observer.observe(card)
        }
        // Функция вызывается при пересечении элемента с областью видимости
        _intFunc(entry) {
            if (entry.isIntersecting) {

                this._entryCounter = ++this._entryCounter


                const delay = this._getDelay(entry.target)

                const currentDelay = delay + (delay * this._entryCounter)


                this._itemAction(entry.target, currentDelay)
            } else {
                if (this._entryCounter > 0) {
                    this._entryCounter = --this._entryCounter
                }

            }

        }
        _itemAction(card, delay) {
            //функция которая выполняется при пересечении

        }
    }

    class StepAnimate extends StepIntersect {
        constructor({
            boardSelector = "[data-step-animate]",
            delayAttrSelector = "[data-delay]",
            delayDataName = "delay",
            threshold = 0.1
        } = {}) { // вот тут = {}
            super({ boardSelector, delayAttrSelector, delayDataName, threshold });
        }
        _itemAction(card, delay) {
            const animateItem = () => {
                card.classList.add("step-animate");
                this._observer.unobserve(card);
            }
            setTimeout(animateItem, delay)
        }

    }
    // Основной класс ленивой загрузки карточек внутри доски
    //атрибуты вешаем на доску а не на карты
    class LazyBoard extends StepIntersect {

        constructor({
            boardSelector = "[data-lazy-board]",
            delayAttrSelector = "[data-delay]",
            delayDataName = "delay",
            threshold = 0.1
        } = {}) { // вот тут = {}
            super({ boardSelector, delayAttrSelector, delayDataName, threshold });
        }

        // Найти картинку с data-src внутри карточки (если есть)
        _checkLazyImage(card) {
            const lazyImage = card.querySelector('[data-src]');
            if (lazyImage) return lazyImage;
        }

        // Загрузка одной карточки и рекурсивный переход к следующей
        _itemAction(card, delay) {


            const image = this._checkLazyImage(card);

            // Если изображения нет — просто убираем из наблюдения
            if (!image) {
                this._observer.unobserve(card);
                return;
            }

            // Создаём клон изображения для предварительной загрузки
            let imageClone = new Image();
            image.src = image.dataset.src; // Назначаем реальный src
            imageClone.src = image.dataset.src;

            const load = () => {
                setTimeout(() => {
                    // Помечаем карточку как загруженную (в CSS появляется изображение)
                    card.classList.add("card-loaded");

                    // Снимаем наблюдение — карточка загружена
                    this._observer.unobserve(card);
                }, delay);
            }

            // Обработка успешной загрузки или ошибки
            imageClone.onload = load;
            imageClone.onerror = load;
        }


    }



    const BODY = document.body;
    const HEADER = document.querySelector(".header");
    const scrollListener = new Listener("scroll", window);
    const clickListener = new Listener("click");
    const resizeListener = new Listener("resize", window);
    const inputListener = new Listener("input");
    const overListener = new Listener("pointerover");
    const outListener = new Listener("pointerout");
    const headerHeight = new ElemHeight(HEADER, "--header-size");
    const swipeListener = new Swipe;
    const lockBody = new BodyLock;
    const scrollDir = new ScrollDirection;
    new Preloader({
        afterfunc: afterLoad
    });
    new HoverEffect;
    new ActivePageNavMarker(".menu__list");
    new BeforeAfterGallery;
    new Burger;
    new HeaderBehavior(".titlepage");
    new ResizeLoad;
    function afterLoad() {
        new LazyBoard;
        new StepAnimate;
    }
    window["FLS"] = true;
    isWebp();
})();