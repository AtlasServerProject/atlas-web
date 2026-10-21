import { jsPDF } from 'jspdf';
import type { OrderReceipt } from './order.service';

export function createReceiptPdf(receipt: OrderReceipt) {
  const pdf = new jsPDF();
  pdf.setProperties({ title: 'Comprovante de pagamento - Atlas Cobblemon' });
  const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: receipt.order.currency,
  });
  const date = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'America/Fortaleza',
    }).format(new Date(value));
  let y = 22;
  const line = (value: string, heading = false) => {
    pdf.setFont('helvetica', heading ? 'bold' : 'normal');
    pdf.setFontSize(heading ? 16 : 11);
    const lines = pdf.splitTextToSize(
      value.replace(/[\u0000-\u001f\u007f]/g, ' '),
      170,
    ) as string[];
    for (const text of lines) {
      if (y > 275) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(text, 20, y);
      y += heading ? 9 : 6;
    }
    y += 3;
  };
  const order = receipt.order;
  line('Atlas Cobblemon', true);
  line('Comprovante de pagamento', true);
  line('Pedido: ' + order.id);
  line('Produto: ' + order.snapshot.productName + ' - ' + order.snapshot.durationDays + ' dias');
  line('Jogador: ' + order.snapshot.nickname + ' - ' + order.snapshot.server);
  line('Valor do pedido: ' + money.format(order.totalCents / 100));
  line('Data do pedido (Brasília): ' + date(order.createdAt));
  const states: Record<string, string> = {
    approved: 'Aprovado',
    refunded: 'Reembolsado',
    charged_back: 'Contestado',
  };
  for (const payment of receipt.payments) {
    line('Mercado Pago - pagamento ' + payment.id, true);
    if (payment.mode === 'test') line('PAGAMENTO DE TESTE - SEM COBRANÇA REAL');
    line('Situação: ' + (states[payment.status] || 'Em análise'));
    line('Última atualização (Brasília): ' + date(payment.updatedAt));
    if (payment.duplicate)
      line('Pagamento duplicado em revisão; não representa uma segunda entrega.');
  }
  line(
    'Comprovante emitido pelo Atlas com os dados verificados do pagamento. Não é uma nota fiscal.',
  );
  return pdf;
}
