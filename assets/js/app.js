/**
 * Класс App отвечает за инициализацию основных компонентов и функционала сайта:
 * анимация статистики, обработка навигации, модальных окон, форм и пр.
 */
class App {
	/** @type {string} */
	#apiUrl = 'https://idevlogic.ru/hackathon/test.php'

	/** @type {NodeListOf<Element>|null} */
	#statsEl = null

	/**
	 * Параметры анимации элементов статистики.
	 * @type {{duration: number, threshold: number, root: null, rootMargin: string}}
	 */
	#animateStataParams = {
		duration: 2000,
		threshold: 0.1,
		root: null,
		rootMargin: '0px',
	}

	// FIX – инициализация значения, ранее было null, что могло привести к ошибкам при первой проверке существования.
	/** @type {NodeListOf<Element>} */
	#sections = document.querySelectorAll('section')
	/** @type {NodeListOf<Element>} */
	#menuLinks = document.querySelectorAll('.header__nav-menu .nav__link')
	/** @type {NodeListOf<Element>} */
	#scrollToLinks = document.querySelectorAll('a[data-scroll-to]')
	/** @type {NodeListOf<Element>} */
	#modalOpenLinks = document.querySelectorAll('[data-modal-open]')
	/** @type {NodeListOf<Element>} */
	#modalCloseLinks = document.querySelectorAll('[data-modal-close]')
	/** @type {Element|null} */
	#modalBackdrop = document.querySelector('.modal-backdrop')
	/** @type {NodeListOf<HTMLDialogElement>} */
	#modals = document.querySelectorAll('dialog.modal')
	/** @type {Element|null} */
	#burger = document.querySelector('.header__burger')
	/** @type {Element|null} */
	#menu = document.querySelector('.header__nav-menu')
	/** @type {NodeListOf<HTMLFormElement>} */
	#forms = document.querySelectorAll('form')

	/**
	 * Параметры подсветки активного меню.
	 * @type {{activeClass: string, root: null, rootMargin: string, threshold: number}}
	 */
	#highlightActiveMenuParams = {
		activeClass: 'active',
		root: null,
		rootMargin: '-100px 0px -100px 0px',
		threshold: 0.4,
	}

	/** @type {boolean} */
	#burgerOpen = false
	/** @type {Element|null} */
	#header = null

	/**
	 * Состояние форм.
	 * @type {Object}
	 */
	#formState = {
		'login-form': {
			login: {
				value: '',
				errors: [],
			},
			password_login: {
				value: '',
				errors: [],
			},
		},
		'register-form': {
			name: {
				value: '',
				errors: [],
			},
			email: {
				value: '',
				errors: [],
			},
			password: {
				value: '',
				errors: [],
			},
			password2: {
				value: '',
				errors: [],
			},
		},
	}
	/**
	 * Текстовые сообщения для ошибок валидации форм.
	 * @type {Object}
	 */
	#fieldErrors = {
		loginIncorrect:
			'Логин должен содержать от 5 до 15 символов, состоять из букв латинского алфавита, цифр и знака подчеркивания.',
		passwordEmpty: 'Пароль не может быть пустым.',
		nameIncorrect:
			'Имя должно содержать от 3 до 50 символов, состоять из букв латинского и кириллического алфавита, пробелов и дефиса.',
		emailIncorrect: 'Введите корректный email.',
		passwordLengthError: 'Пароль должен быть от 5 до 10 символов.',
		passwordUpperCaseError:
			'Пароль должен содержать хотя бы одну букву в верхнем регистре.',
		passwordLowerCaseError:
			'Пароль должен содержать хотя бы одну букву в нижнем регистре.',
		passwordDigitError: 'Пароль должен содержать хотя бы одну цифру.',
		passwordSpecCharError:
			'Пароль должен содержать хотя бы один специальный символ (!@#$%^&*).',
		passwordConfirmError: 'Пароли не совпадают.',
		checkFormField: 'Форма содержит ошибки:',
	}

	/**
	 * Создаёт экземпляр App и инициализирует функционал.
	 */
	constructor() {
		this.init()
	}

	/**
	 * Инициирует работу приложения: настраивает overflow, кэширует изображения,
	 * инициализирует наблюдатели над секциями, статистикой, навигацией, модальными окнами,
	 * бургер-меню и формами.
	 * @returns {void}
	 */
	init() {
		this.#setOverflow(true)

		this.#cachedImg()

		this.#header = document.querySelector('.header')

		this.#statsEl = document.querySelectorAll('.stat-digit')
		if (this.#statsEl.length > 0) {
			// FIX – проверка на существование элементов через length
			this.#observeStatsElements()
		}

		// FIX – удалены лишние проверки, так как элементы инициализируются в начале класса
		if (this.#sections.length > 0 && this.#menuLinks.length > 0) {
			this.#observeSectionsElements()
		}

		if (this.#scrollToLinks.length > 0) {
			this.#scrollToInit()
		}

		if (
			this.#modalOpenLinks.length > 0 &&
			this.#modalCloseLinks.length > 0 &&
			this.#modalBackdrop &&
			this.#modals.length > 0
		) {
			this.#modalInit()
		}

		if (this.#burger && this.#menu) {
			this.#burgerInit()
		}

		if (this.#forms.length > 0) {
			this.#formsInit()
		}
		this.#setOverflow(false)
	}

	/**
	 * Возвращает Promise, который разрешается через указанное количество миллисекунд.
	 * @param {number} [ms=1000] - Время задержки в миллисекундах.
	 * @returns {Promise<void>}
	 * @private
	 */
	#delay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms))

	/**
	 * Отправляет данные на сервер методом POST.
	 * Получает объект payload с данными формы, формирует FormData и отправляет запрос.
	 * @param {Object} payload - Объект с данными формы.
	 * @returns {Promise<Object>} Результат запроса в виде объекта.
	 * @private
	 */
	#useFetch = async payload => {
		try {
			await this.#delay(3000)

			const formData = new FormData()
			// Перебираем ключи объекта payload и добавляем их в formData.
			for (const key in payload) {
				formData.append(key, payload[key])
			}

			const response = await fetch(this.#apiUrl, {
				method: 'POST',
				credentials: 'same-origin',
				body: formData,
			})
			const data = await response.json()
			return data
		} catch (error) {
			return {
				status: false,
				data: null,
				alerts: [error.message],
			}
		}
	}

	/**
	 * Безопасно устанавливает стиль CSS для DOM-элемента.
	 * Использует сначала element.style.setProperty, а при ошибке – setAttribute.
	 * @param {HTMLElement} element - DOM-элемент, для которого устанавливается стиль.
	 * @param {string} property - Имя CSS-свойства.
	 * @param {string} value - Значение свойства.
	 * @param {string|null} [important=null] - Если задано, применяется с !important.
	 * @returns {void}
	 * @private
	 */
	#safeSetStyle = (element, property, value, important = null) => {
		if (!element || !property || typeof value !== 'string') return

		try {
			element.style.setProperty(property, value, important)
		} catch (e) {
			try {
				element.setAttribute(
					'style',
					`${property}: ${value} ${important || ''}`
				)
			} catch (e) {
				console.warn(`safeSetStyle: Failed to set style for ${property}`, e)
			}
		}
	}

	/**
	 * Анимирует число в элементе: плавно увеличивает значение от 0 до целевого значения.
	 * @param {Element} element - DOM-элемент с числовым значением.
	 * @param {number} duration - Длительность анимации в миллисекундах.
	 * @returns {void}
	 * @private
	 */
	#animateStats = (element, duration) => {
		const targetValue = parseInt(element.getAttribute('data-count'), 10)
		const startValue = 0
		const increment = targetValue / (duration / 10)
		let currentValue = startValue
		const timer = setInterval(() => {
			currentValue += increment

			if (currentValue >= targetValue) {
				currentValue = targetValue
				clearInterval(timer)
			}

			element.textContent = Math.floor(currentValue)
		}, 10)
	}

	/**
	 * Создаёт IntersectionObserver для анимации элементов статистики при их попадании в область видимости.
	 * @returns {void}
	 * @private
	 */
	#observeStatsElements = () => {
		const observerOptions = {
			root: this.#animateStataParams.root,
			rootMargin: this.#animateStataParams.rootMargin,
			threshold: this.#animateStataParams.threshold,
		}

		const observer = new IntersectionObserver((entries, observer) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const element = entry.target
					const duration = this.#animateStataParams.duration

					this.#animateStats(element, duration)
					observer.unobserve(element)
				}
			})
		}, observerOptions)

		this.#statsEl.forEach(element => {
			observer.observe(element)
		})
	}

	/**
	 * Создаёт IntersectionObserver для отслеживания секций страницы и подсветки соответствующих элементов меню.
	 * @returns {void}
	 * @private
	 */
	#observeSectionsElements = () => {
		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					const sectionId = entry.target.id

					this.#menuLinks.forEach(link => {
						const parent = link.parentElement
						const sectionIdFromLink = link.getAttribute('href')

						if (sectionIdFromLink === `#${sectionId}`) {
							if (entry.isIntersecting) {
								parent.classList.add(
									this.#highlightActiveMenuParams.activeClass
								)
							} else {
								parent.classList.remove(
									this.#highlightActiveMenuParams.activeClass
								)
							}
						}
					})
				})
			},
			{
				root: this.#highlightActiveMenuParams.root,
				rootMargin: this.#highlightActiveMenuParams.rootMargin,
				threshold: this.#highlightActiveMenuParams.threshold,
			}
		)
		this.#sections.forEach(section => {
			observer.observe(section)
		})
	}

	/**
	 * Вычисляет ширину полосы прокрутки браузера.
	 * @returns {number} Ширина полосы прокрутки в пикселях.
	 * @private
	 */
	#getScrollbarWidth = () => {
		const outer = document.createElement('div')
		this.#safeSetStyle(outer, 'visibility', 'hidden')
		this.#safeSetStyle(outer, 'overflow', 'scroll')
		this.#safeSetStyle(outer, 'msOverflowStyle', 'scrollbar')
		this.#safeSetStyle(outer, 'width', '100px')
		this.#safeSetStyle(outer, 'height', '100px')
		this.#safeSetStyle(outer, 'position', 'absolute') // FIX – необходимо для корректного расчёта
		this.#safeSetStyle(outer, 'top', '-9999px')

		document.body.appendChild(outer)

		const inner = document.createElement('div')
		this.#safeSetStyle(inner, 'width', '100%')
		this.#safeSetStyle(inner, 'height', '100%')
		outer.appendChild(inner)

		const scrollbarWidth = outer.offsetWidth - inner.offsetWidth

		outer.parentNode.removeChild(outer)

		return scrollbarWidth
	}

	/**
	 * Устанавливает overflow для html-элемента, а также paddingRight для компенсации полосы прокрутки.
	 * @param {boolean} [status=true] - Если true, скрывает overflow.
	 * @returns {void}
	 * @private
	 */
	#setOverflow = (status = true) => {
		const scrollbarWidth = status ? `${this.#getScrollbarWidth()}px` : ''
		const overflow = status ? 'hidden' : ''

		const html = document.querySelector('html')

		this.#safeSetStyle(html, 'overflow', overflow)
		this.#safeSetStyle(html, 'paddingRight', scrollbarWidth) // FIX – устанавливаем paddingRight для компенсации scrollbar
	}

	/**
	 * Загружает ресурс с кэшированием: пытается вернуть ответ из Cache API, а если его нет – запрашивает через fetch.
	 * @param {string} mediaFileUrl - URL запрашиваемого ресурса.
	 * @param {Cache} cache - Объект Cache для хранения ресурса.
	 * @returns {Promise<Response>} Промис с ответом.
	 * @private
	 */
	#fetchAndCache(mediaFileUrl, cache) {
		return cache.match(mediaFileUrl).then(cacheResponse => {
			if (cacheResponse) {
				return cacheResponse
			}
			return fetch(mediaFileUrl, { cache: 'force-cache' }).then(
				networkResponse => {
					cache.put(mediaFileUrl, networkResponse.clone())
					return networkResponse
				}
			)
		})
	}

	/**
	 * Кэширует изображения сайта с использованием Cache API.
	 * @returns {Promise<void>}
	 * @private
	 */
	#cachedImg = async () => {
		if (location.origin.startsWith('file://') || !('caches' in window)) return

		try {
			const images = document.querySelectorAll('img')
			const imageUrls = [
				...new Set(Array.from(images).map(img => img.dataset.src || img.src)),
			]

			const cache = await caches.open('image-pre-cache')
			await Promise.all(imageUrls.map(url => this.#fetchAndCache(url, cache)))
		} catch (error) {
			console.error('Error caching images:', error)
		}
	}

	/**
	 * Инициализирует функциональность модальных окон: обработку открытия/закрытия,
	 * кликов вне окна и нажатия Escape.
	 * @returns {void}
	 * @private
	 */
	#modalInit = () => {
		let clicked = 0

		/**
		 * Возвращает первое открытое модальное окно.
		 * @returns {HTMLDialogElement|undefined}
		 */
		const getModalOpened = () => {
			return Array.from(this.#modals).find(modal_ => modal_.open)
		}
		/**
		 * Возвращает модальное окно по его идентификатору.
		 * @param {string} id - Идентификатор модального окна.
		 * @returns {HTMLDialogElement|undefined}
		 */
		const getModalById = id => {
			return Array.from(this.#modals).find(
				modal_ => modal_.dataset.modal === id
			)
		}
		/**
		 * Выполняет действие над модальным окном: открытие или закрытие.
		 * @param {string} modal - Идентификатор модального окна.
		 * @param {'showModal'|'close'} method - Метод действия над модальным окном.
		 * @returns {void}
		 */
		const actionModal = (modal, method = 'showModal' || 'close') => {
			const dialog = getModalById(modal)
			const openDialog = getModalOpened()

			this.#formsReset()

			if (dialog) {
				switch (method) {
					case 'showModal':
						openDialog?.close()
						dialog.showModal()
						this.#setOverflow(true)
						this.#modalBackdrop.classList.add('show')
						break
					case 'close':
						dialog.close()
						clicked = 0
						this.#modalBackdrop.classList.remove('show')
						this.#setOverflow(false)
				}
			}
		}

		this.#modalOpenLinks.forEach(link => {
			link.addEventListener('click', e => {
				e.preventDefault()
				actionModal(e.target.dataset.modalOpen, 'showModal')
			})
		})
		this.#modalCloseLinks.forEach(link => {
			link.addEventListener('click', e => {
				e.preventDefault()
				const dialog = getModalOpened()
				actionModal(dialog.dataset.modal, 'close')
			})
		})

		document.addEventListener('click', e => {
			const openDialog = getModalOpened()
			if (openDialog) {
				clicked++
				const modalId = openDialog.dataset.modal
				const rect = openDialog.getBoundingClientRect()
				// Используем rect.bottom и rect.right для точной проверки границ модального окна.
				const isInDialog =
					rect.top <= e.clientY &&
					e.clientY <= rect.bottom &&
					rect.left <= e.clientX &&
					e.clientX <= rect.right
				if (!isInDialog && clicked > 1) {
					actionModal(modalId, 'close')
				}
			}
		})
		document.addEventListener('keydown', e => {
			const openDialog = getModalOpened()
			if (openDialog && e.key === 'Escape') {
				clicked++
				const modalId = openDialog.dataset.modal
				if (clicked > 1) {
					actionModal(modalId, 'close')
				}
			}
		})
	}

	/**
	 * Инициализирует функциональность плавной прокрутки по data-scroll-to.
	 * @returns {void}
	 * @private
	 */
	#scrollToInit = () => {
		/**
		 * Прокручивает страницу к указанному элементу.
		 * @param {string} id - Идентификатор элемента.
		 * @returns {void}
		 */
		const scrollTo = id => {
			if (id === 'offer') {
				window.scrollTo({
					top: 0,
					behavior: 'smooth',
				})
			} else {
				const element = document.getElementById(id)
				if (element) {
					// FIX – получаем offsetHeight header для вычисления корректного смещения
					const headerOffset = this.#header ? this.#header.offsetHeight : 0
					const elementPosition = element.getBoundingClientRect().top
					const offsetPosition =
						elementPosition + window.pageYOffset - headerOffset
					window.scrollTo({
						top: offsetPosition,
						behavior: 'smooth',
					})
				}
			}
		}

		this.#scrollToLinks.forEach(link => {
			link.addEventListener('click', e => {
				e.preventDefault()
				scrollTo(e.target.dataset.scrollTo)
			})
		})
	}

	/**
	 * Инициализирует работу бургер-меню: переключение состояния, закрытие по клику вне меню и по клику на ссылки.
	 * @returns {void}
	 * @private
	 */
	#burgerInit = () => {
		/**
		 * Переключает состояние бургер-меню.
		 * @returns {void}
		 */
		const menuToggle = () => {
			this.#burgerOpen = !this.#burgerOpen
			this.#header.classList.toggle('active')
			this.#burger.classList.toggle('active')
			this.#setOverflow(this.#burgerOpen)
		}
		/**
		 * Закрывает бургер-меню.
		 * @returns {void}
		 */
		const menuClose = () => {
			this.#burgerOpen = false
			this.#header.classList.remove('active')
			this.#burger.classList.remove('active')
			this.#setOverflow(false)
		}
		/**
		 * Открывает бургер-меню.
		 * @returns {void}
		 */
		const menuOpen = () => {
			this.#burgerOpen = true
			this.#header.classList.add('active')
			this.#burger.classList.add('active')
			this.#setOverflow(true)
		}

		this.#burger.addEventListener('click', () => {
			menuToggle()
		})
		document.addEventListener('click', event => {
			if (this.#burgerOpen) {
				// FIX – используется contains для проверки, находится ли клик внутри меню или по кнопке-бургеру.
				const isClickInsideMenu = this.#menu.contains(event.target)
				const isClickOnBurger = this.#burger.contains(event.target)
				if (!isClickInsideMenu && !isClickOnBurger) {
					menuClose()
				}
			}
		})
		// FIX – закрытие меню по клику на ссылки внутри меню.
		this.#menu.addEventListener('click', event => {
			if (event.target.classList.contains('nav__link')) {
				menuClose()
			}
		})
	}

	/**
	 * Инициализирует обработку форм: отслеживание изменений, отправку и сброс.
	 * @returns {void}
	 * @private
	 */
	#formsInit = () => {
		/**
		 * Возвращает форму по её идентификатору.
		 * @param {string} id - Идентификатор формы.
		 * @returns {HTMLFormElement|undefined} - Найденная форма или `undefined`, если форма не найдена.
		 */
		const getFormById = id => {
			return Array.from(this.#forms).find(form => form.id === id)
		}

		/**
		 * Отображает сообщения об ошибках или успехе в форме.
		 * @param {HTMLElement} container - Контейнер для вывода сообщений.
		 * @param {Array<string>} [alerts=[]] - Массив сообщений.
		 * @returns {void}
		 */
		const renderAlert = (container, alerts = []) => {
			if (!container) return

			this.#formsResetAlerts()
			container.innerHTML = ''
			alerts.forEach(alert => {
				const wrapper = document.createElement('p')
				wrapper.innerHTML = alert
				container.appendChild(wrapper)
			})

			if (alerts.length) {
				container.classList.remove('hide')
			}
		}

		/**
		 * Отправляет форму с указанным идентификатором.
		 * @async
		 * @param {string} id - Идентификатор формы.
		 * @returns {Promise<void>}
		 */
		const submitForm = async id => {
			const form = getFormById(id)
			if (!form) return // Проверка на существование формы

			form.classList.add('fetching')
			const state = this.#formState[id]

			// Клиентская валидация перед отправкой
			const validationResult = this.#validateForm(id, state)
			if (!validationResult.isValid) {
				form.classList.remove('fetching')
				const alertContainerError = form.querySelector('.form-fieldset-error')
				renderAlert(alertContainerError, [
					this.#fieldErrors.checkFormField,
					...validationResult.errors,
				])
				return
			}

			// Формирование данных для отправки
			const payload = { form: id }
			for (const name in state) {
				payload[name] = state[name].value
			}

			// Выполнение запроса
			const { status, data, alerts } = await this.#useFetch(payload)

			// Выбор контейнера для сообщений
			const alertContainerClass = status
				? '.form-fieldset-success'
				: '.form-fieldset-error'
			const alertContainer = form.querySelector(alertContainerClass)

			renderAlert(
				alertContainer,
				status ? alerts : [this.#fieldErrors.checkFormField, ...alerts]
			)

			// Сброс формы при успешной отправке
			if (status) {
				setTimeout(() => {
					this.#formsReset()
				}, 3000) // Уменьшено время до 3 секунд
			}

			form.classList.remove('fetching')
		}

		// Обработчик изменения полей формы
		document.addEventListener('change', e => {
			const formId = e?.target?.closest('form')?.id
			if (!formId || !this.#formState[formId]) return // Проверка наличия formId в состоянии формы

			const state = this.#formState[formId]
			const { name, value: rawValue } = e.target
			if (state[name]) {
				state[name].value = rawValue.trim()
			}
		})

		// Обработчик отправки формы
		document.addEventListener('submit', e => {
			e.preventDefault()
			const formId = e?.target?.closest('form')?.id
			if (!formId) return

			submitForm(formId)
		})
	}

	/**
	 * Выполняет клиентскую валидацию формы по её идентификатору.
	 * @param {string} formId - Идентификатор формы.
	 * @param {Object} state - Объект состояния формы.
	 * @returns {{isValid: boolean, errors: Array<string>}} - Объект с флагом валидации и списком ошибок.
	 * @private
	 */
	#validateForm = (formId, state) => {
		const errors = []
		let isValid = true

		if (formId === 'login-form') {
			const login = state.login.value
			const password_login = state.password_login.value

			if (!login) {
				errors.push('Логин не может быть пустым.')
				isValid = false
			} else if (!/^[a-zA-Z0-9_]{5,15}$/.test(login)) {
				errors.push(this.#fieldErrors.loginIncorrect)
				isValid = false
			}
			if (!password_login) {
				errors.push(this.#fieldErrors.passwordEmpty)
				isValid = false
			}
		} else if (formId === 'register-form') {
			const name = state.name.value
			const email = state.email.value
			const password = state.password.value
			const password2 = state.password2.value

			if (!name) {
				errors.push('Имя не может быть пустым.')
				isValid = false
			} else if (name.length < 3 || name.length > 50) {
				errors.push(this.#fieldErrors.nameIncorrect)
				isValid = false
			}
			if (!email) {
				errors.push('Email не может быть пустым.')
				isValid = false
			} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				errors.push(this.#fieldErrors.emailIncorrect)
				isValid = false
			}
			if (!password) {
				errors.push(this.#fieldErrors.passwordEmpty)
				isValid = false
			} else if (password.length < 5 || password.length > 10) {
				errors.push(this.#fieldErrors.passwordLengthError)
				isValid = false
			} else {
				// Проверка на наличие специального символа
				if (!/(?=.*[!@#$%^&*])/.test(password)) {
					errors.push(this.#fieldErrors.passwordSpecCharError)
					isValid = false
				}
				// Новая проверка на наличие хотя бы одной заглавной буквы
				if (!/(?=.*[A-Z])/.test(password)) {
					errors.push('Пароль должен содержать хотя бы одну заглавную букву.')
					isValid = false
				}
			}
			if (password !== password2) {
				errors.push(this.#fieldErrors.passwordConfirmError)
				isValid = false
			}
		}

		return { isValid, errors }
	}

	/**
	 * Сбрасывает значения и состояние для всех форм.
	 * @returns {void}
	 * @private
	 */
	#formsReset = () => {
		if (this.#forms) {
			this.#forms.forEach(form => {
				form.reset()
				form.querySelectorAll('.form-fieldset-alert').forEach(element => {
					element.innerHTML = ''
					element.classList.add('hide')
				})
				const state = this.#formState[form.id]
				if (state) {
					// FIX – проверка существования состояния формы
					for (const name in state) {
						state[name] = {
							value: '',
							errors: [],
						}
					}
				}
			})
		}
	}

	/**
	 * Сбрасывает оповещения для всех форм.
	 * @returns {void}
	 * @private
	 */
	#formsResetAlerts = () => {
		if (this.#forms) {
			this.#forms.forEach(form => {
				form.querySelectorAll('.form-fieldset-alert').forEach(element => {
					element.innerHTML = ''
					element.classList.add('hide')
				})
			})
		}
	}
}

document.addEventListener('DOMContentLoaded', () => new App())
