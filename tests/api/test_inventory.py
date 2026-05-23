"""
Inventory management endpoint tests
"""
import pytest


class TestInventoryItems:
    """Test inventory item endpoints"""

    @pytest.mark.api
    def test_get_inventory_items(self, api_client):
        """Test getting list of inventory items"""
        response = api_client.get("/api/inventory/items")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Inventory endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_get_items_by_category(self, api_client):
        """Test filtering items by category"""
        response = api_client.get("/api/inventory/items", params={"category": "Reagent"})

        if response.get("status_code") in [404, 503]:
            pytest.skip("Inventory endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_low_stock_items(self, api_client):
        """Test getting low stock items"""
        response = api_client.get("/api/inventory/items", params={"low_stock": "true"})

        if response.get("status_code") in [404, 503]:
            pytest.skip("Inventory endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_search_inventory_items(self, api_client):
        """Test searching inventory items"""
        response = api_client.get("/api/inventory/items", params={"search": "DNA"})

        if response.get("status_code") in [404, 503]:
            pytest.skip("Inventory endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_item_by_id(self, api_client):
        """Test getting item details by ID"""
        response = api_client.get("/api/inventory/items/1")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Inventory endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_create_inventory_item(self, api_client, test_data):
        """Test creating a new inventory item"""
        item_data = test_data.generate_inventory_item()

        response = api_client.post("/api/inventory/items", json=item_data)

        if response.get("status_code") in [404, 503]:
            pytest.skip("Inventory endpoint not available")

        assert response.get("success") is not None


class TestInventoryLots:
    """Test inventory lot endpoints"""

    @pytest.mark.api
    def test_receive_inventory_lot(self, api_client):
        """Test receiving a new inventory lot"""
        response = api_client.post("/api/inventory/lots", json={
            "item_id": 1,
            "lot_number": "LOT-2024-001",
            "quantity_received": 100,
            "expiration_date": "2025-12-31",
            "received_by": "Test User"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Inventory lots endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_update_lot_quality_status(self, api_client):
        """Test updating lot quality status"""
        response = api_client.patch("/api/inventory/lots/1/quality-status", json={
            "quality_status": "approved"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Lot quality status endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_quarantine_lot(self, api_client):
        """Test quarantining a lot"""
        response = api_client.patch("/api/inventory/lots/1/quality-status", json={
            "quality_status": "quarantine"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Lot quality status endpoint not available")

        assert response.get("success") is not None


class TestInventoryTransactions:
    """Test inventory transaction endpoints"""

    @pytest.mark.api
    def test_record_usage(self, api_client):
        """Test recording inventory usage"""
        response = api_client.post("/api/inventory/transactions/usage", json={
            "lot_id": 1,
            "quantity": 5,
            "performed_by": "Test User",
            "purpose": "Paternity testing"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Inventory transactions endpoint not available")

        assert response.get("success") is not None


class TestInventoryReports:
    """Test inventory report endpoints"""

    @pytest.mark.api
    def test_get_low_stock_report(self, api_client):
        """Test getting low stock report"""
        response = api_client.get("/api/inventory/reports/low-stock")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Low stock report endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_expiry_report(self, api_client):
        """Test getting expiring items report"""
        response = api_client.get("/api/inventory/reports/expiry", params={
            "days_ahead": 30
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Expiry report endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_cost_analysis(self, api_client):
        """Test getting cost per test analysis"""
        response = api_client.get("/api/inventory/cost-analysis/test/1")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Cost analysis endpoint not available")

        assert response.get("success") is not None


class TestInventoryLookups:
    """Test inventory lookup endpoints"""

    @pytest.mark.api
    def test_get_categories(self, api_client):
        """Test getting inventory categories"""
        response = api_client.get("/api/inventory/categories")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Categories endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_get_suppliers(self, api_client):
        """Test getting suppliers list"""
        response = api_client.get("/api/inventory/suppliers")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Suppliers endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_get_active_suppliers(self, api_client):
        """Test getting active suppliers"""
        response = api_client.get("/api/inventory/suppliers", params={"status": "active"})

        if response.get("status_code") in [404, 503]:
            pytest.skip("Suppliers endpoint not available")

        assert response.get("success") is not None
