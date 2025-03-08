import { getAllFilesRowData } from "../turso";
import type { ImageFileNode } from "@/types";
import { NodesDeserializer_Json } from "@/store/nodesDeserializer_Json";
import type { LoadData } from "@/store/nodesSerializer";
import type { APIContext } from "@/types";

export async function getAllFiles(context?: APIContext): Promise<ImageFileNode[]> {
  try {
    const fileRowData = await getAllFilesRowData(context);

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
