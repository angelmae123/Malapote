
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../providers";
import { apiRequest } from "../../../../lib/api";
import { toast } from "react-toastify";

const EMPTY_FORM = {
  mill_inventory_id: "",
  product_name: "",
  category: "",
  price: "0",
  description: "",
  status: "Available",
};

const STATUS_OPTIONS = ["Available", "Inactive"];

const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://127.0.0.1:3000";

const inputClass =
  "w-full rounded-xl border border-[#54ACBF]/30 bg-[#A7EBF2]/10 px-3.5 py-2.5 text-[12px] text-[#011C40] outline-none transition placeholder:text-[#26658C]/50 focus:border-[#26658C] focus:bg-white focus:ring-2 focus:ring-[#54ACBF]/15 disabled:cursor-not-allowed disabled:opacity-60";

// RESPONSE HELPERS

function getResponseData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.records)) return response.records;
  if (Array.isArray(response?.data?.records)) return response.data.records;

  return [];
}

function getInventoryId(inventory) {
  return inventory?.id ?? inventory?.mill_inventory_id;
}

function getImageUrl(path) {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) return path;

  return `${BACKEND_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-PH");
}

// MILL INVENTORY HELPERS

function getInventoryStock(inventory) {
  return Number(inventory?.stock_quantity ?? 0);
}

function getInventorySacks(inventory) {
  return Number(inventory?.sack_quantity ?? 0);
}

function getInventorySackSize(inventory) {
  if (!inventory) return 0;

  return Number(inventory.sack_weight_kg ?? 0);
}

function isLooseRice(inventory) {
  if (!inventory) return false;

  return getInventorySackSize(inventory) <= 0;
}

function getInventoryDisplaySize(inventory) {
  if (!inventory) return "—";

  const sackSize = getInventorySackSize(inventory);

  if (sackSize > 0) {
    return `${formatNumber(sackSize)} kg Sack`;
  }

  return "Loose Rice (Per kg)";
}

function formatInventoryStock(inventory) {
  if (!inventory) return "No linked inventory";

  const stock = getInventoryStock(inventory);
  const sacks = getInventorySacks(inventory);
  const sackSize = getInventorySackSize(inventory);

  if (sackSize > 0) {
    return `${formatNumber(sacks)} sacks / ${formatNumber(stock)} kg`;
  }

  return `${formatNumber(stock)} kg`;
}

function getProductStatus(product, inventory) {
  if (product.status === "Inactive") {
    return "Inactive";
  }

  if (!inventory) {
    return "Out of Stock";
  }

  return getInventoryStock(inventory) > 0
    ? "Available"
    : "Out of Stock";
}

// MAIN COMPONENT

export default function ProductsPage() {
  const { session } = useAuth();

  const token = session?.accessToken;
  const fileInputRef = useRef(null);
  const imagePreviewRef = useRef("");

  const [products, setProducts] = useState([]);
  const [inventories, setInventories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  // IMAGE PREVIEW CLEANUP

  const updateImagePreview = useCallback((value) => {
    const previous = imagePreviewRef.current;

    if (previous.startsWith("blob:")) {
      URL.revokeObjectURL(previous);
    }

    imagePreviewRef.current = value;
    setImagePreview(value);
  }, []);

  const resetImage = useCallback(() => {
    updateImagePreview("");
    setSelectedImage(null);
    setRemoveImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [updateImagePreview]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, []);

  // LOAD PRODUCTS AND INVENTORY

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [productResponse, inventoryResponse] = await Promise.all([
        apiRequest("sales/products", { token }),
        apiRequest("mill/inventory", { token }),
      ]);

      setProducts(getResponseData(productResponse));
      setInventories(getResponseData(inventoryResponse));
    } catch (err) {
      const message =
        err.message || "Unable to load products and inventory.";

      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, loadData]);

  // INVENTORY LOOKUP

  const inventoryMap = useMemo(() => {
    return new Map(
      inventories.map((inventory) => [
        String(getInventoryId(inventory)),
        inventory,
      ])
    );
  }, [inventories]);

  const getLinkedInventory = useCallback(
    (product) => {
      return inventoryMap.get(String(product.mill_inventory_id)) || null;
    },
    [inventoryMap]
  );

  const selectedInventory = useMemo(() => {
    return inventoryMap.get(String(form.mill_inventory_id)) || null;
  }, [inventoryMap, form.mill_inventory_id]);

  // FILTER PRODUCTS

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      const inventory = getLinkedInventory(product);

      const searchValues = [
        product.product_name,
        product.category,
        product.description,
        inventory?.item_name,
        inventory?.variety,
        inventory?.sack_weight_kg,
        inventory?.sack_quantity,
      ];

      const matchesSearch =
        !keyword ||
        searchValues
          .filter((value) => value !== null && value !== undefined)
          .some((value) =>
            String(value).toLowerCase().includes(keyword)
          );

      const status = getProductStatus(product, inventory);

      const matchesStatus =
        statusFilter === "All" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter, getLinkedInventory]);

  // SUMMARY

  const summary = useMemo(() => {
    const available = products.filter(
      (product) =>
        getProductStatus(product, getLinkedInventory(product)) === "Available"
    ).length;

    const outOfStock = products.filter(
      (product) =>
        getProductStatus(product, getLinkedInventory(product)) === "Out of Stock"
    ).length;

    const inactive = products.filter(
      (product) => product.status === "Inactive"
    ).length;

    return {
      total: products.length,
      available,
      outOfStock,
      inactive,
    };
  }, [products, getLinkedInventory]);

  // IMAGE HANDLING

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedImage(file);
    setRemoveImage(false);
    updateImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    resetImage();
    setRemoveImage(true);
  }

  // MODAL HANDLING

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    resetImage();
  }

  function openAddModal() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    resetImage();
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);

    setForm({
      mill_inventory_id: String(product.mill_inventory_id ?? ""),
      product_name: product.product_name ?? "",
      category: product.category ?? "",
      price: String(product.price ?? "0"),
      description: product.description ?? "",
      status: product.status === "Inactive" ? "Inactive" : "Available",
    });

    resetImage();

    if (product.image) {
      updateImagePreview(getImageUrl(product.image));
    }

    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // SAVE PRODUCT

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.product_name.trim()) {
      toast.error("Product name is required.");
      return;
    }

    if (!form.mill_inventory_id || !selectedInventory) {
      toast.error("Please select a valid Mill Inventory record.");
      return;
    }

    if (getInventoryStock(selectedInventory) <= 0) {
      toast.error("The selected inventory has no available stock.");
      return;
    }

    if (
      form.price === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      toast.error("Please enter a valid selling price.");
      return;
    }

    setSaving(true);

    const formData = new FormData();

    formData.append("mill_inventory_id", form.mill_inventory_id);
    formData.append("product_name", form.product_name.trim());
    formData.append("category", form.category.trim());
    formData.append("price", form.price);
    formData.append("description", form.description.trim());
    formData.append("status", form.status);

    formData.append(
      "image",
      editingProduct?.image && !removeImage ? editingProduct.image : ""
    );

    if (selectedImage) {
      formData.append("image_file", selectedImage);
    }

    if (editingProduct && removeImage) {
      formData.append("remove_image", "1");
    }

    try {
      if (editingProduct) {
        await apiRequest(`sales/products/${editingProduct.id}`, {
          method: "PUT",
          token,
          body: formData,
        });

        toast.success("Product updated successfully.");
      } else {
        await apiRequest("sales/products", {
          method: "POST",
          token,
          body: formData,
        });

        toast.success("Product added successfully.");
      }

      setModalOpen(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
      resetImage();

      await loadData();
    } catch (err) {
      toast.error(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE PRODUCT

  async function handleDelete(product) {
    const inventory = getLinkedInventory(product);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.product_name}" (${getInventoryDisplaySize(inventory)})?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`sales/products/${product.id}`, {
        method: "DELETE",
        token,
      });

      toast.success("Product deleted successfully.");
      await loadData();
    } catch (err) {
      toast.error(err.message || "Unable to delete product.");
    }
  }

  // PAGE

  return (
    <main className="min-h-screen bg-[#F3F8FA] p-3 text-[#011C40] sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
              SALES MANAGEMENT
            </p>

            <h1 className="font-serif text-xl tracking-tight text-[#011C40] sm:text-2xl">
              Products
            </h1>

            <p className="mt-1 max-w-2xl text-[12px] text-[#26658C]">
              Manage rice product listings, selling prices, and product images.
              Sack information and available stock are automatically retrieved
              from Mill Inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-[#023859] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#011C40]"
          >
            + Add Product
          </button>
        </header>

        {/* SUMMARY */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            label="Total Products"
            value={formatNumber(summary.total)}
            icon="▤"
          />

          <SummaryCard
            label="Available Products"
            value={formatNumber(summary.available)}
            icon="✓"
          />
        </section>

        {/* PRODUCT BREAKDOWN */}

        <section className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">
          <div className="mb-3">
            <h2 className="text-[12px] font-bold text-[#011C40]">
              Product Status Overview
            </h2>

            <p className="mt-0.5 text-[10px] text-[#26658C]">
              Current distribution of your product listings.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BreakdownItem
              label="Available"
              value={summary.available}
              color="text-emerald-700"
            />

            <BreakdownItem
              label="Out of Stock"
              value={summary.outOfStock}
              color="text-red-700"
            />

            <BreakdownItem
              label="Inactive"
              value={summary.inactive}
              color="text-[#26658C]"
            />
          </div>
        </section>

        {/* PAGE ERROR */}

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
            {pageError}
          </div>
        )}

        {/* PRODUCTS TABLE */}

        <section className="overflow-hidden rounded-2xl border border-[#54ACBF]/25 bg-white shadow-sm">

          {/* TABLE HEADER */}

          <div className="flex flex-col gap-3 border-b border-[#A7EBF2]/50 p-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#011C40]">
                Product Listings
              </h2>

              <p className="mt-1 text-[11px] text-[#26658C]">
                Sack details and available stock are linked directly to Mill Inventory.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className={`${inputClass} sm:w-52`}
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`${inputClass} sm:w-40`}
              >
                <option value="All">All Status</option>
                <option value="Available">Available</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-4 py-2 text-[11px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-[11px]">

              <thead className="bg-[#A7EBF2]/20 text-[10px] uppercase tracking-wider text-[#023859]">
                <tr>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Inventory Source</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Sack Size</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3">Available Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#A7EBF2]/30">

                {loading ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-4 py-12 text-center text-[11px] text-[#26658C]"
                    >
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-4 py-12 text-center text-[11px] text-[#26658C]"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const inventory = getLinkedInventory(product);
                    const status = getProductStatus(product, inventory);

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-[#A7EBF2]/10"
                      >

                        {/* IMAGE */}

                        <td className="px-4 py-3">
                          {product.image ? (
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.product_name}
                              className="h-12 w-12 rounded-xl border border-[#54ACBF]/25 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#54ACBF]/20 bg-[#A7EBF2]/20 text-[9px] text-[#26658C]">
                              No image
                            </div>
                          )}
                        </td>

                        {/* PRODUCT */}

                        <td className="px-4 py-3">
                          <p className="font-bold text-[#011C40]">
                            {product.product_name}
                          </p>

                          {product.description && (
                            <p className="mt-1 max-w-48 truncate text-[10px] text-[#26658C]">
                              {product.description}
                            </p>
                          )}
                        </td>

                        {/* INVENTORY SOURCE */}

                        <td className="px-4 py-3">
                          {inventory ? (
                            <>
                              <p className="font-semibold text-[#011C40]">
                                {inventory.item_name || "—"}
                              </p>

                              {inventory.variety && (
                                <p className="mt-1 text-[10px] text-[#26658C]">
                                  {inventory.variety}
                                </p>
                              )}

                              <p className="mt-1 text-[10px] font-semibold text-[#26658C]">
                                Inventory #{getInventoryId(inventory)}
                              </p>
                            </>
                          ) : (
                            <span className="text-[10px] font-semibold text-red-600">
                              Inventory not found
                            </span>
                          )}
                        </td>

                        {/* CATEGORY */}

                        <td className="px-4 py-3 text-[#26658C]">
                          {product.category || "—"}
                        </td>

                        {/* SACK SIZE */}

                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg border border-[#54ACBF]/20 bg-[#A7EBF2]/30 px-2.5 py-1.5 text-[10px] font-bold text-[#023859]">
                            {getInventoryDisplaySize(inventory)}
                          </span>
                        </td>

                        {/* PRICE */}

                        <td className="px-4 py-3">
                          <p className="font-bold text-[#011C40]">
                            {formatCurrency(product.price)}
                          </p>

                          <p className="mt-1 text-[10px] text-[#26658C]">
                            {isLooseRice(inventory) ? "Per kg" : "Per sack"}
                          </p>
                        </td>

                        {/* STOCK */}

                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#011C40]">
                            {inventory
                              ? formatInventoryStock(inventory)
                              : "—"}
                          </p>
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>

                        {/* ACTIONS */}

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="rounded-lg border border-[#54ACBF]/30 bg-[#A7EBF2]/20 px-3 py-2 text-[10px] font-semibold text-[#023859] transition hover:bg-[#A7EBF2]/60"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(product)}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER */}

          <div className="border-t border-[#A7EBF2]/40 bg-[#A7EBF2]/10 px-4 py-3">
            <p className="text-[10px] text-[#26658C]">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          </div>

        </section>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#011C40]/60 p-3 backdrop-blur-sm sm:p-5">

          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#54ACBF]/30 bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#A7EBF2]/60 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[9px] font-extrabold tracking-[1.5px] text-[#54ACBF]">
                  PRODUCT MANAGEMENT
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#011C40]">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>

                <p className="mt-0.5 text-[11px] text-[#26658C]">
                  {editingProduct
                    ? "Update the product listing details."
                    : "Create a new product listing using Mill Inventory stock."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A7EBF2]/30 text-xl text-[#26658C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >

              {/* MODAL CONTENT */}

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">

                {/* PRODUCT IMAGE */}

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                    Product Image
                  </label>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#54ACBF]/40 bg-[#A7EBF2]/10">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Product preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-[10px] text-[#26658C]">
                          <div className="mb-1 text-2xl">▧</div>
                          No image selected
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="block w-full text-[11px] text-[#26658C] file:mr-3 file:rounded-lg file:border-0 file:bg-[#023859] file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-white hover:file:bg-[#011C40]"
                      />

                      <p className="text-[10px] text-[#26658C]">
                        JPG, PNG, or WEBP. Maximum file size: 5 MB.
                      </p>

                      {imagePreview && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-[10px] font-semibold text-red-600 hover:underline"
                        >
                          Remove image
                        </button>
                      )}
                    </div>

                  </div>
                </div>

                {/* PRODUCT DETAILS */}

                <div className="grid gap-4 sm:grid-cols-2">

                  <FormField label="Product Name" required>
                    <input
                      name="product_name"
                      value={form.product_name}
                      onChange={handleChange}
                      required
                      maxLength={150}
                      className={inputClass}
                      placeholder="e.g. Premium Rice"
                    />
                  </FormField>

                  <FormField label="Category">
                    <input
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      maxLength={50}
                      className={inputClass}
                      placeholder="e.g. Premium"
                    />
                  </FormField>

                  {/* LINKED MILL INVENTORY */}

                  <div className="sm:col-span-2">
                    <FormField label="Linked Mill Inventory" required>
                      <select
                        name="mill_inventory_id"
                        value={form.mill_inventory_id}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      >
                        <option value="">
                          Select Mill Inventory Record
                        </option>

                        {inventories.map((inventory) => (
                          <option
                            key={getInventoryId(inventory)}
                            value={getInventoryId(inventory)}
                          >
                            {inventory.item_name}
                            {inventory.variety
                              ? ` - ${inventory.variety}`
                              : ""}
                            {` - ${getInventoryDisplaySize(inventory)}`}
                            {` - ${formatInventoryStock(inventory)}`}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    {inventories.length === 0 ? (
                      <p className="mt-2 text-[10px] text-red-600">
                        No Mill Inventory records available. Add an inventory
                        record first.
                      </p>
                    ) : (
                      <p className="mt-2 text-[10px] text-[#26658C]">
                        Select an inventory record. Sack size, sack quantity,
                        and stock will automatically be retrieved.
                      </p>
                    )}
                  </div>

                  {/* AUTOMATIC INVENTORY INFORMATION */}

                  <div className="sm:col-span-2">
                    <div className="rounded-xl border border-[#54ACBF]/25 bg-[#A7EBF2]/15 p-4">

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#023859]">
                            Mill Inventory Information
                          </p>

                          <p className="mt-1 text-[10px] text-[#26658C]">
                            Automatically retrieved. Read-only.
                          </p>
                        </div>

                        <span className="rounded-lg border border-[#54ACBF]/20 bg-white px-3 py-2 text-[10px] font-bold text-[#023859]">
                          {selectedInventory
                            ? getInventoryDisplaySize(selectedInventory)
                            : "No selection"}
                        </span>
                      </div>

                      {selectedInventory ? (
                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#54ACBF]/20 pt-3">

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Inventory Item
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-[#011C40]">
                              {selectedInventory.item_name || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Rice Variety
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-[#011C40]">
                              {selectedInventory.variety || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Sack Quantity
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-[#011C40]">
                              {getInventorySackSize(selectedInventory) > 0
                                ? `${formatNumber(getInventorySacks(selectedInventory))} sacks`
                                : "Not applicable"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#26658C]">
                              Sack Weight
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-[#011C40]">
                              {getInventorySackSize(selectedInventory) > 0
                                ? `${formatNumber(getInventorySackSize(selectedInventory))} kg per sack`
                                : "Loose Rice"}
                            </p>
                          </div>

                          <div className="col-span-2 border-t border-[#54ACBF]/20 pt-3">
                            <p className="text-[10px] text-[#26658C]">
                              Current Available Stock
                            </p>

                            <p className="mt-1 text-lg font-bold text-[#023859]">
                              {formatNumber(getInventoryStock(selectedInventory))} kg
                            </p>

                            <p className="mt-1 text-[10px] text-[#26658C]">
                              Source: Mill Inventory
                            </p>
                          </div>

                        </div>
                      ) : (
                        <p className="mt-3 border-t border-[#54ACBF]/20 pt-3 text-[10px] text-[#26658C]">
                          Select an inventory record to automatically
                          display its sack quantity, sack weight, and stock.
                        </p>
                      )}

                    </div>
                  </div>

                  {/* SELLING PRICE */}

                  <FormField
                    label={
                      selectedInventory && isLooseRice(selectedInventory)
                        ? "Selling Price per Kilogram"
                        : "Selling Price per Sack"
                    }
                    required
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#26658C]">
                        ₱
                      </span>

                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={handleChange}
                        required
                        className={`${inputClass} pl-8`}
                        placeholder="0.00"
                      />
                    </div>
                  </FormField>

                  {/* STATUS */}

                  <FormField label="Status" required>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* DESCRIPTION */}

                  <div className="sm:col-span-2">
                    <FormField label="Description">
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={4}
                        className={inputClass}
                        placeholder="Enter product description..."
                      />
                    </FormField>
                  </div>

                </div>
              </div>

              {/* MODAL FOOTER */}

              <div className="flex justify-end gap-2 border-t border-[#A7EBF2]/50 bg-white px-5 py-4 sm:px-6">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[#54ACBF]/30 bg-white px-4 py-2.5 text-[11px] font-semibold text-[#26658C] transition hover:bg-[#A7EBF2]/20 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || inventories.length === 0}
                  className="rounded-xl bg-[#023859] px-5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#011C40] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Update Product"
                      : "Save Product"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}

// REUSABLE COMPONENTS

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#023859]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#54ACBF]/25 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7EBF2]/40 text-lg font-bold text-[#26658C]">
        {icon}
      </div>

      <div>
        <p className="text-[11px] font-medium text-[#26658C]">
          {label}
        </p>

        <p className="mt-0.5 text-xl font-bold text-[#011C40]">
          {value}
        </p>
      </div>
    </div>
  );
}

function BreakdownItem({ label, value, color }) {
  return (
    <div className="rounded-lg border border-[#54ACBF]/15 bg-white/80 px-3 py-2.5">
      <p className="text-[10px] font-medium text-[#26658C]">
        {label}
      </p>

      <p className={`mt-1 text-lg font-bold ${color}`}>
        {formatNumber(value)}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Available: "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Out of Stock": "border-red-200 bg-red-50 text-red-700",
    Inactive: "border-[#54ACBF]/20 bg-[#A7EBF2]/20 text-[#26658C]",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
        styles[status] || "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}
