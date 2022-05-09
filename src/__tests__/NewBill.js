/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";
jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
	describe("When I am on NewBill Page", () => {
		test("Then mail icon in vertical layout should be highlighted", async () => {
			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
			});
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);

			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.NewBill);
			await waitFor(() => screen.getByTestId("icon-mail"));
			const windowIcon = screen.getByTestId("icon-mail");
			const iconActivated = windowIcon.classList.contains("active-icon");
			expect(iconActivated).toBeTruthy();
		});
	});

	describe("When I am on NewBill Page", () => {
		test("Then the new bill's form should be loaded with its fields", () => {
			const html = NewBillUI();
			document.body.innerHTML = html;
			expect(screen.getByTestId("form-new-bill")).toBeTruthy();
			expect(screen.getByTestId("expense-type")).toBeTruthy();
			expect(screen.getByTestId("expense-name")).toBeTruthy();
			expect(screen.getByTestId("datepicker")).toBeTruthy();
			expect(screen.getByTestId("amount")).toBeTruthy();
			expect(screen.getByTestId("vat")).toBeTruthy();
			expect(screen.getByTestId("pct")).toBeTruthy();
			expect(screen.getByTestId("commentary")).toBeTruthy();
			expect(screen.getByTestId("file")).toBeTruthy();
			expect(screen.getByRole("button")).toBeTruthy();
		});

		test("Then I can select upload an image file", () => {
			const html = NewBillUI();
			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
			});
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
					email: "azerty@email.com",
				})
			);
			document.body.innerHTML = html;
			mockStore.bills = jest.fn().mockImplementation(() => {
				return {
					create: () => {
						return Promise.resolve({});
					},
				};
			});

			const onNavigate = (pathname) => {
				document.body.innerHTML = pathname;
			};
			const newBill = new NewBill({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const mockHandleChangeFile = jest.fn(newBill.handleChangeFile);
			const inputJustificative = screen.getByTestId("file");
			expect(inputJustificative).toBeTruthy();
			const file = new File(["file"], "file.jpg", { type: "image/jpeg" });
			// Simulate if the file is an correct format
			inputJustificative.addEventListener("change", mockHandleChangeFile);
			fireEvent.change(inputJustificative, {
				target: {
					files: [file],
				},
			});

			expect(mockHandleChangeFile).toHaveBeenCalled();
			expect(inputJustificative.files).toHaveLength(1);

			jest.spyOn(window, "alert").mockImplementation(() => {});
			expect(window.alert).not.toHaveBeenCalled();
		});

		test("Then I can't select upload a non image file", () => {
			const html = NewBillUI();
			document.body.innerHTML = html;
			const store = null;
			const onNavigate = (pathname) => {
				document.body.innerHTML = pathname;
			};
			const newBill = new NewBill({
				document,
				onNavigate,
				store,

				localStorage: window.localStorage,
			});

			const mockHandleChangeFile = jest.fn(newBill.handleChangeFile);

			const inputJustificative = screen.getByTestId("file");
			expect(inputJustificative).toBeTruthy();

			// Simulate if the file is wrong format
			inputJustificative.addEventListener("change", mockHandleChangeFile);
			fireEvent.change(inputJustificative, {
				target: {
					files: [new File(["file.pdf"], "file.pdf", { type: "file/pdf" })],
				},
			});
			expect(mockHandleChangeFile).toHaveBeenCalled();
			expect(inputJustificative.files[0].name).not.toBe("file.jpg");

			jest.spyOn(window, "alert").mockImplementation(() => {});
			expect(window.alert).toHaveBeenCalled();
		});
	});
});

describe("Given I am a user connected as Employee", () => {
	describe("When I submit the form completed", () => {
		test("Then the bill is created", async () => {
			const html = NewBillUI();
			document.body.innerHTML = html;

			const onNavigate = (pathname) => {
				document.body.innerHTML = ROUTES({ pathname });
			};

			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
			});
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
					email: "azerty@email.com",
				})
			);

			const newBill = new NewBill({
				document,
				onNavigate,
				store: null,
				localStorage: window.localStorage,
			});

			const validBill = {
				type: "Restaurants et bars",
				name: "Vol Paris Londres",
				date: "2022-02-15",
				amount: 200,
				vat: 70,
				pct: 30,
				commentary: "Commentary",
				fileUrl: "../img/0.jpg",
				fileName: "test.jpg",
				status: "pending",
			};

			// Load the values in the fields
			screen.getByTestId("expense-type").value = validBill.type;
			screen.getByTestId("expense-name").value = validBill.name;
			screen.getByTestId("datepicker").value = validBill.date;
			screen.getByTestId("amount").value = validBill.amount;
			screen.getByTestId("vat").value = validBill.vat;
			screen.getByTestId("pct").value = validBill.pct;
			screen.getByTestId("commentary").value = validBill.commentary;

			newBill.fileName = validBill.fileName;
			newBill.fileUrl = validBill.fileUrl;

			newBill.updateBill = jest.fn();
			const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));

			const form = screen.getByTestId("form-new-bill");
			form.addEventListener("submit", handleSubmit);
			fireEvent.submit(form);

			expect(handleSubmit).toHaveBeenCalled();
			expect(newBill.updateBill).toHaveBeenCalled();
		});

		test("fetches error from an API and fails with 500 error", async () => {
			jest.spyOn(mockStore, "bills");
			jest.spyOn(console, "error").mockImplementation(() => {}); // Prevent Console.error jest error

			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
			});
			Object.defineProperty(window, "location", {
				value: { hash: ROUTES_PATH["NewBill"] },
			});

			window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));
			document.body.innerHTML = `<div id="root"></div>`;
			router();

			const onNavigate = (pathname) => {
				document.body.innerHTML = ROUTES({ pathname });
			};

			mockStore.bills = jest.fn().mockImplementation(() => {
				return {
					update: () => {
						return Promise.reject(new Error("Erreur 500"));
					},
					list: () => {
						return Promise.reject(new Error("Erreur 500"));
					},
				};
			});
			const newBill = new NewBill({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			//submit the form
			const form = screen.getByTestId("form-new-bill");
			const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
			form.addEventListener("submit", handleSubmit);
			fireEvent.submit(form);
			await new Promise(process.nextTick);
			expect(console.error).toBeCalled();
		});
	});
});
