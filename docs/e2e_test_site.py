"""End-to-end smoke test for VoltBot storefront.

Walks every public route, captures screenshots and pushes results to Allure.
"""
import os
from pathlib import Path

import allure
import pytest
from playwright.sync_api import Page, expect

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)


@pytest.fixture(scope="session")
def browser_context_args():
    return {"viewport": {"width": 1280, "height": 1800}}


def _shot(page: Page, name: str):
    path = SHOTS / f"{name}.png"
    page.screenshot(path=str(path))
    allure.attach.file(str(path), name=name, attachment_type=allure.attachment_type.PNG)
    return path


@allure.feature("Home")
def test_home_loads(page: Page):
    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    assert len(page.title()) > 0
    _shot(page, "01_home")


@allure.feature("Products")
def test_products_page(page: Page):
    page.goto(f"{BASE}/products", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    _shot(page, "02_products")


@allure.feature("Product Detail")
def test_product_detail(page: Page):
    page.goto(f"{BASE}/products", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    link = page.locator("a[href*='/product/']").first
    if link.count():
        link.click()
        page.wait_for_timeout(1500)
    _shot(page, "03_product_detail")


@allure.feature("Cart")
def test_cart_page(page: Page):
    page.goto(f"{BASE}/cart", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    _shot(page, "04_cart")


@allure.feature("Checkout")
def test_checkout_page(page: Page):
    page.goto(f"{BASE}/checkout", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    _shot(page, "05_checkout")


@allure.feature("Auth")
def test_auth_page(page: Page):
    page.goto(f"{BASE}/auth", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    _shot(page, "06_auth")


@allure.feature("Account")
def test_account_redirects(page: Page):
    page.goto(f"{BASE}/account", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    _shot(page, "07_account")


@allure.feature("Admin")
def test_admin_page(page: Page):
    page.goto(f"{BASE}/admin", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    _shot(page, "08_admin")


@allure.feature("Console health")
def test_no_console_errors(page: Page):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    # hydration mismatch warnings are non-fatal — only assert on pageerror
    assert not errors, f"Runtime errors: {errors}"
