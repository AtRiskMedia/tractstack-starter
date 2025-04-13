export interface ButtonProps {
  text: string;
  url: string;
  backgroundColor?: string;
  textColor?: string;
}

export function getButton({
  text,
  url,
  backgroundColor = "#0867ec",
  textColor = "#ffffff",
}: ButtonProps): string {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box; width: 100%; min-width: 100%;" width="100%">
      <tbody>
        <tr>
          <td align="left" style="font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top; padding-bottom: 16px;" valign="top">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
              <tbody>
                <tr>
                  <td style="font-family: Helvetica, sans-serif; font-size: 16px; vertical-align: top; border-radius: 4px; text-align: center; background-color: ${backgroundColor};" valign="top" align="center" bgcolor="${backgroundColor}">
                    <a href="${url}" target="_blank" style="border: solid 2px ${backgroundColor}; border-radius: 4px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 16px; font-weight: bold; margin: 0; padding: 12px 24px; text-decoration: none; text-transform: capitalize; background-color: ${backgroundColor}; border-color: ${backgroundColor}; color: ${textColor};">${text}</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

export function getParagraph(text: string): string {
  return `<p style="font-family: Helvetica, sans-serif; font-size: 16px; font-weight: normal; margin: 0; margin-bottom: 16px;">${text}</p>`;
}
