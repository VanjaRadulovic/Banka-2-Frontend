import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import {ClientService} from "../../../services/client.service";
import { UserService } from 'src/app/services/user-service.service';
import { PaymentInfo, Recipient, TransactionInfo } from '../../../models/client.model';
import { ToastrService } from 'ngx-toastr';
import { OverlayPanel } from 'primeng/overlaypanel';

export enum Options {
  NEW_PAYMENT = 'NEW_PAYMENT',
  MONEY_TRANSFER = 'MONEY_TRANSFER',
  PAYMENT_RECIPIENTS = 'PAYMENT_RECIPIENTS',
  PAYMENT_OVERVIEW = 'PAYMENT_OVERVIEW',
}



@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent {

  @ViewChild('op') op: OverlayPanel;


  Options = Options;
  selectedOption: Options;

  createPaymentForm: FormGroup;
  moneyTransferForm: FormGroup;
  addRecipientForm: FormGroup;
  editRecipientForm: FormGroup;
  oneTimePasswordForm: FormGroup;

  paymentAccounts: any[];
  newPayment: any[];

  recipients: any[] = [];

  clientData: string;

  selectedFromPaymentAccount: any;
  selectedToPaymentAccount: any;

  transactionFromAccount: any[];
  transactionToAccount: any[];

  displayAddDialog = false;
  displayEditDialog = false;
  displayOTPDialog: boolean = false;

  selectedRecipient: any;

  constructor(
    private formBuilder: FormBuilder, 
    private clientService: ClientService, 
    private userService: UserService,
    private toastr: ToastrService) {

    this.initForms()

  }

ngOnInit() {
  this.selectedOption = Options.NEW_PAYMENT;
  this.init()
  }

  init(){
    this.getClientData()
    this.getRecipients()
  }

  showAddRecipientDialog() {
    this.displayAddDialog = true;
  }

  showEditRecipientDialog(recipient: any) {
    this.displayEditDialog = true;
    this.selectedRecipient = recipient;
    
    this.editRecipientForm.patchValue({
      name: recipient.name,
      accountNumber: recipient.balanceRegistrationNumber
    });
  }

  addRecipient() {
    if (this.addRecipientForm.invalid) {
      return;
    }

    const newRecipient = this.getNewRecipient() 
    this.displayAddDialog = false;

    this.sendRecipient(newRecipient);
    this.resetForm()
  }

  editRecipient() {
    if (this.editRecipientForm.invalid) {
      return;
    }

    this.selectedRecipient.name = this.editRecipientForm.get('name')?.value;
    this.selectedRecipient.balanceRegistrationNumber = this.editRecipientForm.get('accountNumber')?.value;


    const newRecipient: Recipient = {
      name: this.editRecipientForm.get('name')?.value,
      balanceRegistrationNumber:  this.editRecipientForm.get('accountNumber')?.value,
      savedByClientId: this.clientData
    }

    this.toastr.success("Uspesno izmenjen primalac")

    // this.updateRecipient(newRecipient)
    
    this.editRecipientForm.reset();
    this.displayEditDialog = false;
  }

  deleteRecipient(recipient: any) {
    const index = this.recipients.indexOf(recipient);

    console.log(recipient)
  
    if (index > -1) {
      this.recipients.splice(index, 1);
    }
  }

  onRecipientSelect(recipient: Recipient) {
    this.createPaymentForm.patchValue({
      recipientName: recipient.name,
      recipientAccount: recipient.balanceRegistrationNumber
    });
  }



  onSubmitNewPayment() {
    if (this.createPaymentForm.invalid) {
      return;
    }
    this.displayOTPDialog = true;
    this.sendTokenToEmail()
  }


  sendTokenToEmail(){
    this.userService.sendTokenToEmail(this.clientData).subscribe({
      next: val => {
        this.toastr.info(`Poslat vam je token na ${this.clientData}`);
      },
      error: err => {
        console.log(err);
      }
    })
  }

  submitMoneyTransfer(){

    if (this.moneyTransferForm.invalid) {
      return;
    }

    this.displayOTPDialog = true;
    this.sendTokenToEmail()

  }


  onSelectedFromPaymentAccountChange(selectedAccount: any) {
    if (selectedAccount) {
      const selectedCurrency = selectedAccount.currency;
  
      this.transactionToAccount = this.transactionFromAccount.filter(account => account.currency === selectedCurrency && account !== selectedAccount);
    } else {
      this.transactionToAccount = [];
    }
  }
  


  onSubmitOTP(){
   
    this.userService.checkToken(
      this.oneTimePasswordForm.get('paymentOTP')?.value
    ).subscribe({
      next: val => {
        if(this.selectedOption == Options.MONEY_TRANSFER){
          let newTransaction = this.getTransactionFormData();
          this.sendTransaction(newTransaction)
          this.resetForm();
        }
        if(this.selectedOption == Options.NEW_PAYMENT){          
          let newPayment = this.getPaymentFormData();
          this.sendPayment(newPayment)
          this.resetForm();
       }
      },
      error: err => {
        console.log("neuspesno")
        this.resetForm();
      }
    })
}


  sendRecipient(recipient: Recipient){
    this.clientService.addRecipient(recipient).subscribe({
      next: val => {
        this.toastr.success('Uspešno dodat korisnik');
        this.recipients.push(recipient)
      },
      error: err => {
        this.toastr.error('Neuspešno dodavanje');
        console.log(err);
      }
    })
  }

  updateRecipient(recipient: Recipient){
    this.clientService.updateRecipient(recipient).subscribe({
      next: val => {
        this.toastr.success("Uspešno izmenjen primalac")
      },
      error: err => {
        this.toastr.error("Izmena nije uspela")
        console.log(err);
      }
    })
  }
  

  sendPayment(paymentInfo: any){

    const paymentData: PaymentInfo = {
      receiverName: paymentInfo.recipientName,
      fromBalanceRegNum: paymentInfo.myAccount,
      toBalanceRegNum: paymentInfo.recipientAccount,
      amount: paymentInfo.amount,
      referenceNumber: paymentInfo.numberReference,
      paymentNumber: paymentInfo.paymentCode,
      paymentDescription: paymentInfo.paymentPurpose,
    }
  
    this.displayOTPDialog = false;

    this.clientService.sendPayment(paymentData).subscribe({
      next: val => {
        this.toastr.success('Uspešno slanje');
        console.log(val)
      },
      error: err => {
        this.toastr.error('Neuspešno slanje');
        console.log(err);
      }
    })

  }


  sendTransaction(transactionInfo: TransactionInfo){

    this.displayOTPDialog = false;

    this.clientService.sendTransaction(transactionInfo).subscribe({
      next: val => {
        this.toastr.success('Uspešna transakcija');
        console.log(val)
      },
      error: err => {
        this.toastr.error('Neuspešna transakcija');
        console.log(err);
      }
    })
  }



  getPaymentFormData(){

    const newPayment = {
      recipientName: this.createPaymentForm.get('recipientName')?.value,
      paymentCode: this.createPaymentForm.get('paymentCode')?.value,
      recipientAccount: this.createPaymentForm.get('recipientAccount')?.value,
      paymentPurpose: this.createPaymentForm.get('paymentPurpose')?.value,
      amount: this.createPaymentForm.get('amount')?.value,
      numberReference: this.createPaymentForm.get('numberReference')?.value,
      myAccount: this.createPaymentForm.get('myAccount')?.value.registrationNumber
    };

    return newPayment;
  }

  getTransactionFormData(){
    const transactionInfo: TransactionInfo = {
      fromBalanceRegNum: this.moneyTransferForm.get('selectedFromPaymentAccount')?.value.registrationNumber,
      toBalanceRegNum: this.moneyTransferForm.get('selectedToPaymentAccount')?.value.registrationNumber,
      currency: this.moneyTransferForm.get('selectedFromPaymentAccount')?.value.currency,
      amount: this.moneyTransferForm.get('amount')?.value,
    };

    console.log(transactionInfo)
    return transactionInfo;
  }

  getNewRecipient(){
    const newRecipient: Recipient = {
      name: this.addRecipientForm.get('name')?.value,
      balanceRegistrationNumber: this.addRecipientForm.get('accountNumber')?.value,
      savedByClientId: this.clientData,
    };

    return newRecipient;
  }



  initForms(){
    this.initCreatePaymentForm();
    this.initMoneyTransferForm();
    this.initAddRecipientForm();
    this.initEditRecipientForm();
    this.initOTPForm();
  }

  initCreatePaymentForm(){
    this.createPaymentForm = this.formBuilder.group({
      recipientName: ['', Validators.required],
      paymentCode: ['', Validators.required],
      recipientAccount: ['', Validators.required],
      paymentPurpose: ['', Validators.required],
      amount: [null, Validators.required],
      numberReference: [''],
      myAccount: ['', Validators.required]
    });
  }

  initMoneyTransferForm(){
    this.moneyTransferForm = this.formBuilder.group({
      selectedFromPaymentAccount: ['', Validators.required],
      selectedToPaymentAccount: ['', Validators.required],
      amount: ['', Validators.required]
    });
  }

  initAddRecipientForm(){
    this.addRecipientForm = this.formBuilder.group({
      name: ['', Validators.required],
      accountNumber: [null, [Validators.required, Validators.pattern(/^\d{10}$/)]]
    });
  }

  initEditRecipientForm() {
    this.editRecipientForm = this.formBuilder.group({
      name: [this.selectedRecipient?.name || '', Validators.required],
      accountNumber: [this.selectedRecipient?.accountNumber.toString() || null, [Validators.required, Validators.pattern(/^\d{10}$/)]]
    });
  }

  initOTPForm(){
    this.oneTimePasswordForm = new FormGroup({
      paymentOTP: new FormControl('', Validators.required)
    });
  }

  getClientData(){
    this.clientService.getClientData().subscribe({
      next: value => {
        this.clientData = value
        this.getMyAccounts()
      },
      error: err => {
        console.log(err);
      }
    })
  }

  getRecipients(){
    this.clientService.getRecipients(this.clientData).subscribe({
      next: value => {
        this.recipients = value
      },
      error: err => {
        console.log(err);
      }
    })
  }

  getMyAccounts(){
    this.clientService.getAccountsByClientEmail(this.clientData).subscribe({
      next: (value: any[]) => {

        this.paymentAccounts = value.map(account => ({
          registrationNumber: account.registrationNumber
        }));

        
        this.transactionFromAccount = value.map(account => ({
          currency: account.currency,
          registrationNumber: account.registrationNumber
        }));



      },
      error: err => {
        console.log(err)
      }
    });
  }

  resetForm() {
    this.createPaymentForm.reset();
    this.moneyTransferForm.reset();
    this.addRecipientForm.reset();
  }


}
