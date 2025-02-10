import { getAllMenusRowData } from "../turso";
import type { MenuNode } from "@/types";
import { NodesDeserializer_Json } from "@/store/nodesDeserializer_Json";
import type { LoadData } from "@/store/nodesSerializer";

export async function getAllMenus(): Promise<MenuNode[]> {
  try {
    const menuRowData = await getAllMenusRowData();

    const deserializer = new NodesDeserializer_Json();
    const loadData: LoadData = {};
    menuRowData.forEach((menu) => {
      deserializer.processMenuRowData(menu, loadData);
    });

    return loadData.menuNodes || [];
  } catch (error) {
    console.error("Error in getAllMenus:", error);
    throw error;
  }
}
