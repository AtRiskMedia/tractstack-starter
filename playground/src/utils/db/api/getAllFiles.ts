import { getAllFilesRowData } from "../turso";
import type { ImageFileNode } from "@/types";
import { NodesDeserializer_Json } from "@/store/nodesDeserializer_Json";
import type { LoadData } from "@/store/nodesSerializer";

export async function getAllFiles(): Promise<ImageFileNode[]> {
  try {
    const fileRowData = await getAllFilesRowData();

    const deserializer = new NodesDeserializer_Json();
    const loadData: LoadData = {};
    fileRowData.forEach((file) => {
      deserializer.processImageFileRowData(file, loadData);
    });

    return loadData.fileNodes || [];
  } catch (error) {
    console.error("Error in getAllFiles:", error);
    throw error;
  }
}
