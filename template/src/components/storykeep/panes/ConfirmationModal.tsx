import MultiButtonsModal from "@/components/storykeep/panes/MultiButtonsModal.tsx";

export type ConfirmationModalProps = {
  header: string;
  body?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal = (props: ConfirmationModalProps) => {
  return (
    <MultiButtonsModal header={props.header}
                       body={props.body}
                       buttons={[
                         {
                           text: "Yes",
                           onClick: props.onConfirm,
                           styles: "bg-brand-3 xs:inline-flex items-center px-6 py-3 font-bold text-white rounded-lg transition-colors hover:bg-brand-4"
                         },
                         {
                           text: "No",
                           onClick: props.onCancel,
                           styles: "bg-brand-5 xs:inline-flex items-center px-6 py-3 font-bold text-white rounded-lg transition-colors hover:bg-brand-4"
                         },
                       ]}
                       onClose={props.onCancel}
    />
  )
}

export default ConfirmationModal;